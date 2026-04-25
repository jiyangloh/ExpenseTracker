from pathlib import Path

from fastapi.testclient import TestClient


FIXTURE_DIR = Path(__file__).parent / "fixtures"
SAMPLE_STATEMENT = FIXTURE_DIR / "sample_credit_card_statement.pdf"


def create_project(client: TestClient, name: str = "Website Relaunch") -> dict:
    response = client.post(
        "/projects",
        json={
            "name": name,
            "description": "Client project",
            "start_date": "2026-03-01",
            "end_date": "2026-03-31",
            "total_budget": 10000,
            "status": "active",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_project_crud_flow(client: TestClient) -> None:
    project = create_project(client)

    list_response = client.get("/projects")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    read_response = client.get(f"/projects/{project['id']}")
    assert read_response.status_code == 200
    assert read_response.json()["name"] == "Website Relaunch"

    update_response = client.put(
        f"/projects/{project['id']}",
        json={"name": "Updated Project", "status": "on_hold"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "on_hold"

    delete_response = client.delete(f"/projects/{project['id']}")
    assert delete_response.status_code == 204
    assert client.get(f"/projects/{project['id']}").status_code == 404


def test_income_crud_flow(client: TestClient) -> None:
    project = create_project(client)

    create_response = client.post(
        "/income",
        json={
            "project_id": project["id"],
            "date": "2026-03-05",
            "source": "Client payment",
            "amount": 2500,
            "currency": "MYR",
            "notes": "Deposit",
        },
    )
    assert create_response.status_code == 201
    income = create_response.json()

    list_response = client.get("/income", params={"project_id": project["id"]})
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    update_response = client.put(
        f"/income/{income['id']}",
        json={"amount": 3000, "notes": "Updated deposit"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["amount"] == 3000

    delete_response = client.delete(f"/income/{income['id']}")
    assert delete_response.status_code == 204
    assert client.get(f"/income/{income['id']}").status_code == 404


def test_expense_crud_filtering_and_claim_flow(client: TestClient) -> None:
    project = create_project(client)

    create_response = client.post(
        "/expenses",
        json={
            "project_id": project["id"],
            "transaction_date": "2026-03-10",
            "post_date": "2026-03-11",
            "description": "Grab ride",
            "amount": 42.5,
            "currency": "MYR",
            "category": "travel",
            "is_claimed": False,
            "notes": "Airport ride",
        },
    )
    assert create_response.status_code == 201
    expense = create_response.json()
    assert expense["source"] == "manual"

    filter_response = client.get(
        "/expenses",
        params={
            "project_id": project["id"],
            "category": "travel",
            "is_claimed": False,
        },
    )
    assert filter_response.status_code == 200
    assert len(filter_response.json()) == 1

    toggle_response = client.patch(
        f"/expenses/{expense['id']}/toggle-claim",
        json={"is_claimed": True, "claimed_date": "2026-03-20"},
    )
    assert toggle_response.status_code == 200
    assert toggle_response.json()["is_claimed"] is True
    assert toggle_response.json()["claimed_date"] == "2026-03-20"

    bulk_response = client.patch(
        "/expenses/bulk-claim",
        json={"expense_ids": [expense["id"]], "is_claimed": False},
    )
    assert bulk_response.status_code == 200
    assert bulk_response.json()["updated_count"] == 1
    assert bulk_response.json()["expenses"][0]["claimed_date"] is None

    update_response = client.put(
        f"/expenses/{expense['id']}",
        json={"description": "Grab ride updated", "amount": 50},
    )
    assert update_response.status_code == 200
    assert update_response.json()["amount"] == 50

    delete_response = client.delete(f"/expenses/{expense['id']}")
    assert delete_response.status_code == 204
    assert client.get(f"/expenses/{expense['id']}").status_code == 404


def test_dashboard_aggregation(client: TestClient) -> None:
    project = create_project(client)
    client.post(
        "/income",
        json={
            "project_id": project["id"],
            "date": "2026-03-01",
            "source": "Client",
            "amount": 1000,
        },
    )
    client.post(
        "/expenses",
        json={
            "project_id": project["id"],
            "transaction_date": "2026-03-02",
            "description": "Meal",
            "amount": 100,
            "category": "food",
            "is_claimed": True,
        },
    )
    client.post(
        "/expenses",
        json={
            "project_id": project["id"],
            "transaction_date": "2026-03-03",
            "description": "Taxi",
            "amount": 60,
            "category": "travel",
            "is_claimed": False,
        },
    )

    response = client.get(f"/projects/{project['id']}/dashboard")

    assert response.status_code == 200
    dashboard = response.json()
    assert dashboard["total_income"] == 1000
    assert dashboard["total_expenses"] == 160
    assert dashboard["net_position"] == 840
    assert dashboard["total_claimed"] == 100
    assert dashboard["total_not_claimed"] == 60
    assert {"category": "food", "total": 100} in dashboard["expenses_by_category"]
    assert {"is_claimed": True, "total": 100} in dashboard["expenses_by_claim_status"]


def test_pdf_parse_and_confirm_flow(client: TestClient) -> None:
    project = create_project(client)

    with SAMPLE_STATEMENT.open("rb") as pdf_file:
        parse_response = client.post(
            "/pdf/parse",
            data={"project_id": str(project["id"])},
            files={"file": ("sample_credit_card_statement.pdf", pdf_file, "application/pdf")},
        )

    assert parse_response.status_code == 200
    parsed = parse_response.json()
    assert parsed["candidate_count"] == 27
    assert parsed["duplicate_file"] is False
    descriptions = {transaction["description"] for transaction in parsed["transactions"]}
    assert "PAYMENT - JOMPAY THANK YOU" not in descriptions
    assert "Sub-Total Charges" not in descriptions

    confirm_response = client.post(
        "/pdf/confirm",
        json={
            "project_id": project["id"],
            "filename": parsed["filename"],
            "file_hash": parsed["file_hash"],
            "statement_date": parsed["statement_date"],
            "statement_period_start": parsed["statement_period_start"],
            "statement_period_end": parsed["statement_period_end"],
            "candidate_count": parsed["candidate_count"],
            "transactions": parsed["transactions"][:2],
        },
    )

    assert confirm_response.status_code == 201
    confirmed = confirm_response.json()
    assert confirmed["created_count"] == 2
    assert confirmed["ignored_count"] == 25
    assert all(expense["source"] == "pdf" for expense in confirmed["expenses"])
    assert all(expense["pdf_import_id"] == confirmed["pdf_import"]["id"] for expense in confirmed["expenses"])

    duplicate_response = client.post(
        "/pdf/confirm",
        json={
            "project_id": project["id"],
            "filename": parsed["filename"],
            "file_hash": parsed["file_hash"],
            "statement_date": parsed["statement_date"],
            "statement_period_start": parsed["statement_period_start"],
            "statement_period_end": parsed["statement_period_end"],
            "candidate_count": parsed["candidate_count"],
            "transactions": parsed["transactions"][:1],
        },
    )
    assert duplicate_response.status_code == 409


def test_validation_errors(client: TestClient) -> None:
    invalid_project_response = client.post(
        "/projects",
        json={"name": "Invalid", "status": "paused"},
    )
    assert invalid_project_response.status_code == 422

    missing_project_expense_response = client.post(
        "/expenses",
        json={
            "project_id": 999,
            "transaction_date": "2026-03-02",
            "description": "Missing project",
            "amount": 10,
        },
    )
    assert missing_project_expense_response.status_code == 404

