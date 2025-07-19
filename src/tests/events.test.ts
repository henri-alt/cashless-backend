import request from "supertest";
import app from "../app";
import { prepareDb } from "./fixtures/startDb";
import { closePool } from "../providers/poolProvider";
import {
  LoginMemberResponse,
  GetAllEventsResponse,
  StaffMember,
  PatchEventRequest,
} from "../types";

let admin: Omit<StaffMember, "memberPassword">;
let adminToken: string;
let eventId: string;

describe("Event routes", () => {
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

  it("Should not create event (card price error)", async () => {
    //#region NOT CREATE EV 1
    await request(app)
      .post("/events")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send({
        endDate: new Date().toISOString(),
        eventDescription: "test description",
        eventName: "second event",
        startDate: new Date().toISOString(),
        cardPrice: -1,
      })
      .expect(400);
  });

  it("Should not create event (tag price error)", async () => {
    //#region NOT CREATE EV 2
    await request(app)
      .post("/events")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send({
        endDate: new Date().toISOString(),
        eventDescription: "test description",
        eventName: "second event",
        startDate: new Date().toISOString(),
        tagPrice: -1,
      })
      .expect(400);
  });

  it("Should not update event (card price)", async () => {
    //#region NOT UPDATE EV 1
    await request(app)
      .patch(`/events/${eventId}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send({ cardPrice: -1 })
      .expect(400);
  });

  it("Should not update event (tag price)", async () => {
    //#region NOT UPDATE EV 2
    await request(app)
      .patch(`/events/${eventId}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send({ tagPrice: -1 })
      .expect(400);
  });

  it("Should get all the events", async () => {
    //#region GET ALL EVENTS
    const getEventsResponse = await request(app)
      .get("/events")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    expect((getEventsResponse.body as GetAllEventsResponse).length).toBe(1);
  });

  it("Should get the created event", async () => {
    //#region GET EVENT
    const getEventResponse = await request(app)
      .get(`/events/${eventId}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    expect(getEventResponse.body?.eventId).toBe(eventId);
    expect(getEventResponse.body?.eventStatus).toBe("inactive");
  });

  it("Should update the event", async () => {
    //#region UPDATE EVENT
    const update: PatchEventRequest = {
      eventDescription: "another test description",
      eventName: "patched event name",
      startDate: new Date().toISOString(),
      eventStatus: "active",
    };

    await request(app)
      .patch(`/events/${eventId}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send(update)
      .expect(200);
  });

  it("Should not update the event", async () => {
    //#region NOT UPDATE
    await request(app)
      .patch(`/events/${eventId}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send({})
      .expect(400);
  });

  it("Should delete the event", async () => {
    //#region DELETE EVENT
    await request(app)
      .delete(`/events/${eventId}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    await request(app)
      .get(`/events/${eventId}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(404);

    const staffRes = await request(app)
      .get("/staffMembers")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .query(`eventId=${eventId}`)
      .expect(200);
    expect(staffRes.body?.length).toBe(0);

    const balancesRes = await request(app)
      .get("/balances")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .query(`eventId=${eventId}`)
      .expect(200);
    expect(balancesRes.body?.length).toBe(0);

    const transactionsRes = await request(app)
      .get("/transactions")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .query(`eventId=${eventId}`)
      .expect(200);
    expect(transactionsRes.body?.length).toBe(0);

    const itemsRes = await request(app)
      .get(`/events/${eventId}/items`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);
    expect(itemsRes.body?.length).toBe(0);

    const standsRes = await request(app)
      .get(`/events/${eventId}/stands`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .query(`eventId=${eventId}`)
      .expect(200);
    expect(standsRes.body?.length).toBe(0);
  });
});
