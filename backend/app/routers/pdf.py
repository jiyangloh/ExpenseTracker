from __future__ import annotations

from io import BytesIO
import hashlib

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.routers.utils import get_project_or_404
from app.services.pdf_parser import (
    PDFParserError,
    parse_credit_card_statement_pdf,
)


router = APIRouter(prefix="/pdf", tags=["pdf"])


@router.post("/parse", response_model=schemas.PDFParseResponse)
async def parse_pdf(
    project_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> schemas.PDFParseResponse:
    get_project_or_404(db, project_id)
    validate_pdf_upload(file)

    contents = await file.read()
    file_hash = hashlib.sha256(contents).hexdigest()
    duplicate_file = (
        db.query(models.PDFImport).filter(models.PDFImport.file_hash == file_hash).first()
        is not None
    )

    try:
        parsed = parse_credit_card_statement_pdf(BytesIO(contents))
    except PDFParserError as exc:
        raise HTTPException(status_code=422, detail={"code": exc.code, "message": exc.message}) from exc

    transactions = []
    for index, transaction in enumerate(parsed.transactions):
        is_duplicate = duplicate_file or has_likely_duplicate_expense(
            db=db,
            project_id=project_id,
            transaction_date=transaction.transaction_date,
            post_date=transaction.post_date,
            description=transaction.description,
            amount=float(transaction.amount),
        )
        transactions.append(
            schemas.PDFParsedTransaction(
                index=index,
                post_date=transaction.post_date,
                transaction_date=transaction.transaction_date,
                description=transaction.description,
                amount=float(transaction.amount),
                currency=transaction.currency,
                is_likely_duplicate=is_duplicate,
                duplicate_reason=(
                    "This PDF file has already been imported."
                    if duplicate_file
                    else "A matching expense already exists for this project."
                    if is_duplicate
                    else None
                ),
            )
        )

    return schemas.PDFParseResponse(
        project_id=project_id,
        filename=file.filename or "uploaded.pdf",
        file_hash=file_hash,
        statement_date=parsed.statement_date,
        statement_period_start=parsed.statement_period_start,
        statement_period_end=parsed.statement_period_end,
        candidate_count=len(transactions),
        duplicate_file=duplicate_file,
        transactions=transactions,
    )


@router.post("/confirm", response_model=schemas.PDFConfirmResponse, status_code=201)
def confirm_pdf_transactions(
    payload: schemas.PDFConfirmRequest, db: Session = Depends(get_db)
) -> schemas.PDFConfirmResponse:
    get_project_or_404(db, payload.project_id)

    if db.query(models.PDFImport).filter(models.PDFImport.file_hash == payload.file_hash).first():
        raise HTTPException(
            status_code=409,
            detail={
                "code": "duplicate_pdf_import",
                "message": "This PDF file has already been imported.",
            },
        )

    selected_transactions = [
        transaction for transaction in payload.transactions if transaction.selected
    ]
    if not selected_transactions:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "no_transactions_selected",
                "message": "Select at least one parsed transaction before confirming.",
            },
        )

    duplicate_rows = [
        transaction
        for transaction in selected_transactions
        if has_likely_duplicate_expense(
            db=db,
            project_id=payload.project_id,
            transaction_date=transaction.transaction_date,
            post_date=transaction.post_date,
            description=transaction.description,
            amount=transaction.amount,
        )
    ]
    if duplicate_rows:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "duplicate_expense_rows",
                "message": "One or more selected transactions already exist for this project.",
            },
        )

    pdf_import = models.PDFImport(
        project_id=payload.project_id,
        filename=payload.filename,
        file_hash=payload.file_hash,
        statement_date=payload.statement_date,
        statement_period_start=payload.statement_period_start,
        statement_period_end=payload.statement_period_end,
        candidate_count=payload.candidate_count,
        confirmed_count=len(selected_transactions),
        ignored_count=max(payload.candidate_count - len(selected_transactions), 0),
        status="confirmed",
    )
    db.add(pdf_import)

    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "code": "duplicate_pdf_import",
                "message": "This PDF file has already been imported.",
            },
        ) from exc

    expenses = [
        models.Expense(
            project_id=payload.project_id,
            pdf_import_id=pdf_import.id,
            transaction_date=transaction.transaction_date,
            post_date=transaction.post_date,
            description=transaction.description,
            amount=transaction.amount,
            currency=transaction.currency,
            category=transaction.category,
            is_claimed=transaction.is_claimed,
            claimed_date=transaction.claimed_date if transaction.is_claimed else None,
            notes=transaction.notes,
            source="pdf",
            source_file=payload.filename,
        )
        for transaction in selected_transactions
    ]
    db.add_all(expenses)
    db.commit()
    db.refresh(pdf_import)
    for expense in expenses:
        db.refresh(expense)

    return schemas.PDFConfirmResponse(
        pdf_import=pdf_import,
        created_count=len(expenses),
        ignored_count=pdf_import.ignored_count,
        expenses=expenses,
    )


def validate_pdf_upload(file: UploadFile) -> None:
    filename = file.filename or ""
    content_type = file.content_type or ""
    if not filename.lower().endswith(".pdf") and content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail={
                "code": "invalid_pdf_file",
                "message": "Please upload a PDF file.",
            },
        )


def has_likely_duplicate_expense(
    db: Session,
    project_id: int,
    transaction_date,
    post_date,
    description: str,
    amount: float,
) -> bool:
    query = db.query(models.Expense).filter(
        models.Expense.project_id == project_id,
        models.Expense.transaction_date == transaction_date,
        models.Expense.description == description,
        models.Expense.amount == amount,
    )

    if post_date is None:
        query = query.filter(models.Expense.post_date.is_(None))
    else:
        query = query.filter(models.Expense.post_date == post_date)

    return query.first() is not None

