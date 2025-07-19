import request from "supertest";
import app from "../app";
import { prepareDb } from "./fixtures/startDb";
import { createEventStaff } from "./fixtures/createEventStaff";
import { closePool } from "../providers/poolProvider";
import {
  LoginMemberResponse,
  StaffMember,
  PostItemsRequest,
  CreateStandRequest,
  GetStaffResponse,
  PatchStandRequest,
  CreateBalanceRequest,
  CreateBalanceResponse,
  GetBalancesResponse,
  TopUpRequest,
  PatchBalanceRequest,
  GetBalanceByScanResponse,
} from "../types";
import { v4 } from "uuid";

let admin: Omit<StaffMember, "memberPassword">;
let adminToken: string;
let eventId: string;
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
      menuItems: [],
      staffMembers: [],
      standName: "stand 1",
    };

    await request(app)
      .post(`/events/${eventId}/stands`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send(body)
      .expect(200);
  });

  it("Should update the stand", async () => {
    //#region UPDATE STAND
    const body: PatchStandRequest = {
      menuItems: ["cola"],
      staffMembers: [createdMemberIds[0], createdMemberIds[1]],
      standName: "event stand",
    };

    await request(app)
      .patch(`/events/${eventId}/stands`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .query("standName=stand 1")
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

    const body: LoginMemberResponse = response.body;
    staffToken = body.token;
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
      // memberId: createdMemberIds[1],
    };

    const b2: CreateBalanceRequest = {
      balance: 100,
      isFidelityCard: false,
      scanId: scanIds[1],
      eventId,
      ticketId: ticketIds[1],
      activationCurrency: "EUR",
    };

    const response1 = await request(app)
      .post("/balances")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + staffToken)
      .send(b1)
      .expect(200);

    const response2 = await request(app)
      .post("/balances")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + staffToken)
      .send(b2)
      .expect(200);

    const body1: CreateBalanceResponse = response1.body;
    const body2: CreateBalanceResponse = response2.body;

    expect(body1.balanceId).toBeDefined();
    expect(body2.balanceId).toBeDefined();

    balanceIds.push(body1.balanceId);
    balanceIds.push(body2.balanceId);
  });

  it("Should update a balance", async () => {
    //#region BALANCE UPDATE
    const update: PatchBalanceRequest = {
      balance: 200,
      balanceId: balanceIds[0],
      memberId: createdMemberIds[0],
      scanId: scanIds[0],
    };

    await request(app)
      .patch(`/balances/${balanceIds[0]}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send(update)
      .expect(200);

    const response = await request(app)
      .get("/balances")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .query(`balanceId=${balanceIds[0]}`)
      .expect(200);

    const balances: GetBalancesResponse = response.body;
    expect(balances.balances.length).toBe(1);

    const [balance] = balances.balances;
    expect(balance.balance).toBe(200);
  });

  it("Should top up a balance", async () => {
    //#region TOP UP
    const update: TopUpRequest = {
      amount: 100,
      scanId: scanIds[1],
      ticketId: ticketIds[1],
      topUpDate: new Date().toISOString(),
      topUpCurrency: "EUR",
    };

    await request(app)
      .post("/topUps")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + staffToken)
      .send(update)
      .expect(200);

    const response = await request(app)
      .get("/balances")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .query(`balanceId=${balanceIds[1]}`)
      .expect(200);

    const balances: GetBalancesResponse = response.body;
    expect(balances.balances.length).toBe(1);

    const [balance] = balances.balances;
    expect(balance.balance).toBe(200);
  });

  it("Should read balance from scan id", async () => {
    //#region GET BALANCE FROM SCAN
    const response = await request(app)
      .get(`/balances/${scanIds[1]}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + staffToken)
      .expect(200);

    const balance: GetBalanceByScanResponse = response.body;
    expect(balance.balance).toBe(200);
  });

  it("Should not fund balance", async () => {
    //#region BALANCE NOT FOUND
    await request(app)
      .get(`/balances/${v4()}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + staffToken)
      .expect(404);
  });

  it("Should not top up (no scan ids)", async () => {
    //#region REJECT TOP UPS

    // @ts-ignore
    const update: TopUpRequest = {
      amount: 100,
    };

    await request(app)
      .post("/topUps")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + staffToken)
      .send(update)
      .expect(403);
  });

  it("Should not top up (wrong amounts)", async () => {
    //#region REJECT TOP UPS
    const update: TopUpRequest = {
      // @ts-ignore
      amount: "other thing",
      scanId: scanIds[1],
      ticketId: ticketIds[1],
    };

    await request(app)
      .post("/topUps")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + staffToken)
      .send(update)
      .expect(403);
  });

  it("Should not top up (empty body)", async () => {
    //#region REJECT TOP UPS
    const update = {};

    await request(app)
      .post("/topUps")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + staffToken)
      .send(update)
      .expect(400);
  });

  it("Should get event top ups", async () => {
    //#region GET TOP UPS
    const response = await request(app)
      .get("/topUps")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .query({ eventId })
      .expect(200);

    expect(response.body).toHaveLength(1);
  });

  it("Should delete a balance", async () => {
    //#region BALANCE DELETE
    await request(app)
      .delete(`/balances/${balanceIds[0]}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    const response = await request(app)
      .get("/balances")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .query(`balanceId=${balanceIds[0]}`)
      .expect(200);

    const balances: GetBalancesResponse = response.body;
    expect(balances.balances.length).toBe(0);
  });

  it("Should delete event balances", async () => {
    //#region DELETE EVENT BALANCES
    await request(app)
      .delete(`/balances/event/${eventId}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    const response = await request(app)
      .get("/balances")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .query(`eventId=${eventId}`)
      .expect(200);

    const balances: GetBalancesResponse = response.body;
    expect(balances.balances.length).toBe(0);
  });
});
