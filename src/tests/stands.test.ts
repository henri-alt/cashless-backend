import request from "supertest";
import app from "../app";
import { prepareDb } from "./fixtures/startDb";
import { closePool } from "../providers/poolProvider";
import { createEventStaff } from "./fixtures/createEventStaff";
import {
  LoginMemberResponse,
  StaffMember,
  PostItemsRequest,
  CreateStandRequest,
  GetStandsResponse,
  GetStaffResponse,
  PatchStandRequest,
} from "../types";

let admin: Omit<StaffMember, "memberPassword">;
let adminToken: string;
let eventId: string;
let staffToken: string;
const createdMemberIds: string[] = [];

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

  it("Should get the created item", async () => {
    //#region GET STAND
    const response = await request(app)
      .get(`/events/${eventId}/stands`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    const items = response.body as GetStandsResponse;

    expect(items.length).toBe(1);
  });

  it("Should update the stand", async () => {
    //#region UPDATE STAND
    const body: PatchStandRequest = {
      menuItems: ["cola"],
      staffMembers: [createdMemberIds[0]],
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
        memberEmail: "email2@email.com",
        memberPassword: "Password123!",
      })
      .expect(200);

    const body: LoginMemberResponse = response.body;
    expect(body.menuItems).toBeDefined();
    expect(Object.keys(body.menuItems).length).toBeGreaterThan(0);

    staffToken = body.token;
  });

  it("Should not allow the staff update of another member", async () => {
    //#region reject member update
    await request(app)
      .patch(`/staffMembers/${createdMemberIds[1]}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + staffToken)
      .send({ memberName: "something" })
      .expect(403);
  });

  it("Should remove the member from the stand after delete", async () => {
    //#region DELETE STAFF
    await request(app)
      .delete(`/staffMembers/${createdMemberIds[0]}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    const response = await request(app)
      .get(`/events/${eventId}/stands`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    const items = response.body as GetStandsResponse;

    expect(items.length).toBe(1);
    expect(items[0].staffMembers.length).toBe(0);
  });

  it("Should remove the item from the stand after delete", async () => {
    //#region DELETE ITEM
    await request(app)
      .delete(`/events/${eventId}/items`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .query("itemName=cola")
      .expect(200);

    const response = await request(app)
      .get(`/events/${eventId}/stands`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    const items = response.body as GetStandsResponse;

    expect(items.length).toBe(1);
    expect(items[0].menuItems.length).toBe(0);
  });

  it("Should delete a stand", async () => {
    //#region DELETE STAND
    await request(app)
      .delete(`/events/${eventId}/stands`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .query("standName=event stand")
      .expect(200);

    const response = await request(app)
      .get(`/events/${eventId}/stands`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    const items = response.body as GetStandsResponse;
    expect(items.length).toBe(0);
  });
});
