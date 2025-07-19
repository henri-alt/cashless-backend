import request from "supertest";
import { v4 } from "uuid";
import app from "../app";
import { prepareDb } from "./fixtures/startDb";
import { closePool } from "../providers/poolProvider";
import {
  ClientType,
  StaffMember,
  PostItemsRequest,
  LoginMemberResponse,
  GetStaffResponse,
  CreateStandRequest,
  CreateBalanceRequest,
  CreateBalanceResponse,
  CreateClientRequest,
  CreateClientResponse,
} from "../types";
import { createEventStaff } from "./fixtures/createEventStaff";

let admin: Omit<StaffMember, "memberPassword">;
let adminToken: string;
let eventId: string;
let cashierToken: string;
const createdMemberIds: string[] = [];
const scanIds: string[] = [v4(), v4()];
const ticketIds: string[] = [v4(), v4()];
let balanceId: string;
let clientId: string;

describe("Client routes", () => {
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
  });

  it("Should create a balance", async () => {
    //#region CREATE BALANCE
    const balanceBody: CreateBalanceRequest = {
      balance: 100,
      isFidelityCard: false,
      scanId: scanIds[0],
      eventId,
      ticketId: ticketIds[0],
      activationCurrency: "EUR",
    };

    const balanceResponse = await request(app)
      .post("/balances")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + cashierToken)
      .send(balanceBody)
      .expect(200);

    const balance: CreateBalanceResponse = balanceResponse.body;
    expect(balance.balanceId).toBeDefined();

    balanceId = balance.balanceId;
  });

  it("Should create a client", async () => {
    //#region CREATE CLIENT
    const clientBody: CreateClientRequest = {
      clientEmail: "client@email.com",
      clientName: "test client",
      activationCurrency: "ALL",
      balance: 10_000,
      scanId: scanIds[0],
      ticketId: ticketIds[0],
    };

    const response = await request(app)
      .post("/clients")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + cashierToken)
      .send(clientBody)
      .expect(200);

    const client: CreateClientResponse = response.body;
    expect(client?.clientId).toBeDefined();

    clientId = client.clientId;
  });

  it("Should update the client email", async () => {
    //#region CLIENT UPDATE
    const update = { clientEmail: "updatedClientEmail@email.com" };
    await request(app)
      .patch(`/clients/${clientId}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + cashierToken)
      .send(update)
      .expect(200);

    const updatedResponse = await request(app)
      .get("/clients")
      .query({
        clientId: clientId,
      })
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + cashierToken)
      .expect(200);

    const filteredClients: ClientType[] = updatedResponse.body;
    expect(filteredClients?.length).toBe(1);

    const [client] = filteredClients;
    expect(client.clientEmail).toBe("updatedClientEmail@email.com");
  });

  it("Should delete the client", async () => {
    //#region CLIENT DELETE
    await request(app)
      .delete(`/clients/${clientId}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + cashierToken)
      .expect(200);

    const updatedResponse = await request(app)
      .get("/clients")
      .query({
        clientId: clientId,
      })
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + cashierToken)
      .expect(200);

    const filteredClients: ClientType[] = updatedResponse.body;
    expect(filteredClients?.length).toBe(0);
  });
});
