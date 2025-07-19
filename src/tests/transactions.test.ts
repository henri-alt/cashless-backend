import request from "supertest";
import app from "../app";
import { prepareDb } from "./fixtures/startDb";
import { closePool } from "../providers/poolProvider";
import {
  LoginMemberResponse,
  StaffMember,
  PostItemsRequest,
  CreateStandRequest,
  GetStaffResponse,
  CreateBalanceRequest,
  CreateBalanceResponse,
  GetBalancesResponse,
  CreateTransactionRequest,
  GetTransactionsResponse,
  GetBalanceByScanResponse,
} from "../types";
import { v4 } from "uuid";
import { createEventStaff } from "./fixtures/createEventStaff";

let admin: Omit<StaffMember, "memberPassword">;
let adminToken: string;
let eventId: string;
let cashierToken: string;
let staffToken: string;
const createdMemberIds: string[] = [];
const balanceIds: string[] = [];
const scanIds: string[] = [v4(), v4()];
const ticketIds: string[] = [v4(), v4()];

describe("Stand routers", () => {
  beforeAll(async () => {
    //#region BEFORE ALL
    const dbPrepared = await prepareDb();
    expect(dbPrepared).toBe(true);
  });

  afterAll((done) => {
    closePool();
    done();
  });

  it("Should login the admin", async () => {
    //#region ADMIN LOGIN
    const loginResponse = await request(app)
      .post("/staffMembers/login")
      .set("Content-Type", "application/json")
      .send({
        memberEmail: "email@email.com",
        memberPassword: "Password123!",
      })
      .expect(200);

    const body: LoginMemberResponse = loginResponse.body;

    expect(body.token).toBeDefined();
    admin = body.member;
    adminToken = body.token;
  });

  it("Should create an event", async () => {
    //#region CREATE EVENT
    const createEventResponse = await request(app)
      .post("/events")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send({
        endDate: new Date().toISOString(),
        eventDescription: "test description",
        eventName: "first event",
        startDate: new Date().toISOString(),
      })
      .expect(200);

    expect(createEventResponse.body?.eventId).toBeDefined();
    eventId = createEventResponse.body?.eventId;
  });

  it("Should create event staff", async () => {
    //#region EVENT STAFF
    const createStaffResponse = await createEventStaff(eventId);
    expect(createStaffResponse).toBe(true);
  });

  it("Should get the staff members", async () => {
    //#region GET STAFF
    const getResponse = await request(app)
      .get("/staffMembers")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    const staff = getResponse.body as GetStaffResponse;
    expect(staff.length).toBe(2);
    for (const st of staff) {
      createdMemberIds.push(st.memberId);
    }
  });

  it("Should create event items", async () => {
    //#region CREATE ITEMS
    const items: PostItemsRequest = [
      {
        clientsSold: 0,
        itemCategory: "drinks",
        itemName: "cola",
        itemPrice: 14,
        itemTax: 2,
        staffPrice: 10,
        bonusAvailable: true,
      },
      {
        clientsSold: 0,
        itemCategory: "drinks",
        itemName: "water",
        itemPrice: 15,
        itemTax: 1,
        staffPrice: 13,
        bonusAvailable: true,
      },
    ];

    await request(app)
      .post(`/events/${eventId}/items`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send(items)
      .expect(200);
  });

  it("Should create a stand", async () => {
    //#region CREATE STAND
    const body: CreateStandRequest = {
      menuItems: ["cola"],
      staffMembers: [createdMemberIds[0], createdMemberIds[1]],
      standName: "stand 1",
    };

    await request(app)
      .post(`/events/${eventId}/stands`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send(body)
      .expect(200);
  });

  it("Should start the event", async () => {
    //#region START EVENT
    await request(app)
      .patch(`/events/${eventId}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send({ eventStatus: "active" })
      .expect(200);
  });

  it("Should accept member login", async () => {
    //#region STAFF LOGIN
    const response = await request(app)
      .post("/staffMembers/login")
      .set("Content-Type", "application/json")
      .send({
        memberEmail: "email3@email.com",
        memberPassword: "Password123!",
      })
      .expect(200);

    const r2 = await request(app)
      .post("/staffMembers/login")
      .set("Content-Type", "application/json")
      .send({
        memberEmail: "email2@email.com",
        memberPassword: "Password123!",
      })
      .expect(200);

    cashierToken = response.body?.token;
    staffToken = r2.body?.token;
  });

  it("Should create two balances", async () => {
    //#region CREATE BALANCES
    const b1: CreateBalanceRequest = {
      balance: 100,
      isFidelityCard: false,
      scanId: scanIds[0],
      eventId,
      ticketId: ticketIds[0],
      activationCurrency: "EUR",
    };

    const b2: CreateBalanceRequest = {
      balance: 100,
      isFidelityCard: true,
      scanId: scanIds[1],
      eventId,
      ticketId: ticketIds[1],
      activationCurrency: "EUR",
    };

    const response1 = await request(app)
      .post("/balances")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + cashierToken)
      .send(b1)
      .expect(200);

    const response2 = await request(app)
      .post("/balances")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + cashierToken)
      .send(b2)
      .expect(200);

    const body1: CreateBalanceResponse = response1.body;
    const body2: CreateBalanceResponse = response2.body;

    expect(body1.balanceId).toBeDefined();
    expect(body2.balanceId).toBeDefined();

    balanceIds.push(body1.balanceId);
    balanceIds.push(body2.balanceId);
  });

  it("Should create a transaction", async () => {
    //#region CREATE TRANSACTION
    const body: CreateTransactionRequest = {
      scanId: scanIds[0],
      transactionItems: [
        {
          itemName: "cola",
          quantity: 1,
        },
        {
          itemName: "water",
          quantity: 2,
        },
      ],
    };

    await request(app)
      .post("/transactions")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + staffToken)
      .send(body)
      .expect(200);

    const response = await request(app)
      .get("/balances")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .query(`scanId=${scanIds[0]}`)
      .expect(200);

    const balances: GetBalancesResponse = response.body;
    const [balance] = balances.balances;
    expect(balance).toBeDefined();
    expect(balance.balance).toBe(50);
  });

  it("Should load event analytics", async () => {
    //#region CALC ANALYTICS
    await request(app)
      .post(`/events/${eventId}/analytics`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);
  });

  it("Should reject transaction (no amount)", async () => {
    //#region REJECT - no amount
    const body: CreateTransactionRequest = {
      scanId: scanIds[0],
      transactionItems: [
        {
          itemName: "cola",
          quantity: 1,
        },
        {
          itemName: "water",
          quantity: 2,
        },
      ],
    };

    await request(app)
      .post("/transactions")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + staffToken)
      .send(body)
      .expect(400);
  });

  it("Should reject transaction (invalid item)", async () => {
    //#region REJECT - invalid item
    const body: CreateTransactionRequest = {
      scanId: scanIds[0],
      transactionItems: [
        {
          itemName: "cola",
          quantity: 1,
        },
        {
          itemName: "",
          quantity: 2,
        },
      ],
    };

    await request(app)
      .post("/transactions")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + staffToken)
      .send(body)
      .expect(400);
  });

  it("Should reject transaction (invalid item)", async () => {
    //#region REJECT - invalid item
    const body: CreateTransactionRequest = {
      scanId: scanIds[0],
      transactionItems: [
        {
          itemName: "cola",
          quantity: 1,
        },
        {
          itemName: "",
          quantity: 2,
        },
      ],
    };

    await request(app)
      .post("/transactions")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + staffToken)
      .send(body)
      .expect(400);
  });

  it("Should reject a transaction (low balance)", async () => {
    //#region REJECT - low balance
    const balanceRes = await request(app)
      .get(`/balances/${scanIds[0]}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + staffToken)
      .expect(200);

    const balance: GetBalanceByScanResponse = balanceRes.body;
    expect(balance?.balance).toBeDefined();

    const body: CreateTransactionRequest = {
      scanId: scanIds[0],
      transactionItems: [
        {
          itemName: "cola",
          quantity: 300,
        },
      ],
    };

    await request(app)
      .post("/transactions")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + staffToken)
      .send(body)
      .expect(403);

    const balanceRes2 = await request(app)
      .get(`/balances/${scanIds[0]}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + staffToken)
      .expect(200);

    const balanceAfter: GetBalanceByScanResponse = balanceRes2.body;
    expect(balanceAfter?.balance).toBeDefined();
    expect(balanceAfter.balance).toBe(balance.balance);
  });

  it("Should get the new transactions", async () => {
    //#region GET TRANSACTIONS
    const response = await request(app)
      .get("/transactions")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    const items: GetTransactionsResponse = response.body;
    expect(items.transactions.length).toBe(2);
  });

  it("Should filter the transactions by category", async () => {
    //#region CATEGORY FILTER
    const response = await request(app)
      .get("/transactions")
      .query({
        itemCategory: "drinks",
      })
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    const items: GetTransactionsResponse = response.body;
    expect(items.transactions.length).toBe(2);

    const noDataResponse = await request(app)
      .get("/transactions")
      .query({
        itemCategory: "random",
      })
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    const noItems: GetTransactionsResponse = noDataResponse.body;
    expect(noItems.transactions.length).toBe(0);
  });

  it("Should load event analytics", async () => {
    //#region RE-CALC ANALYTICS
    await request(app)
      .post(`/events/${eventId}/analytics`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);
  });

  it("Should get the event analytics", async () => {
    //#region GET ANALYTICS
    const response = await request(app)
      .get(`/events/${eventId}/analytics`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    expect(response.body).toBeDefined();
  });

  it("Should delete the event transactions", async () => {
    //#region DELETE EVENT TRANSACTIONS
    await request(app)
      .delete(`/transactions/${eventId}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);
  });
});
