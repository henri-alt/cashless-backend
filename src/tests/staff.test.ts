import request from "supertest";
import { v4 } from "uuid";
import app from "../app";
import { prepareDb } from "./fixtures/startDb";
import { closePool } from "../providers/poolProvider";
import {
  AdminType,
  StaffMember,
  CreateStaffRequest,
  LoginMemberResponse,
  CreateMemberResponse,
} from "../types";

let admin: Omit<StaffMember, "memberPassword">;
let adminToken: string;
const createdMemberIds: string[] = [];
let eventId: string;

describe("Staff member routes", () => {
  beforeAll(async () => {
    //#region BEFORE ALL
    const dbPrepared = await prepareDb();
    expect(dbPrepared).toBe(true);
  });

  afterAll((done) => {
    closePool();
    done();
  });

  it("Should fail login attempt (no password field)", async () => {
    //#region FAIL LOGIN - no pass
    await request(app)
      .post("/staffMembers/login")
      .set("Content-Type", "application/json")
      .send({ memberEmail: "email@email.com" })
      .expect(400);
  });

  it("Should fail login attempt (wrong email)", async () => {
    //#region FAIL LOGIN - wr email
    await request(app)
      .post("/staffMembers/login")
      .set("Content-Type", "application/json")
      .send({
        memberEmail: "example@email.com",
        memberPassword: "Password123!",
      })
      .expect(401);
  });

  it("Should fail login attempt (wrong password)", async () => {
    //#region FAIL LOGIN - wr pass
    await request(app)
      .post("/staffMembers/login")
      .set("Content-Type", "application/json")
      .send({
        memberEmail: "email@email.com",
        memberPassword: "Password123!!!!",
      })
      .expect(401);
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

  it("Should get the admin profile", async () => {
    //#region ADMIN PROFILE
    const profileResponse = await request(app)
      .get("/staffMembers/profile")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    const body: AdminType = profileResponse.body;
    expect(body).toBeDefined();
  });

  it("Should not create staff", async () => {
    //#region NOT CREATE STAFF
    await request(app)
      .post("/staffMembers")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send({
        memberEmail: "email2@email.com",
        memberName: "test member1",
        memberPassword: "Password123!",
        profileStatus: "active",
        userClass: "some-class",
      })
      .expect(400);
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

  it("Should create staff members", async () => {
    //#region CREATE STAFF
    const member1: CreateStaffRequest = {
      memberEmail: "email2@email.com",
      memberName: "test member1",
      memberPassword: "Password123!",
      profileStatus: "active",
      userClass: 1,
      eventId,
    };

    const member2: CreateStaffRequest = {
      memberEmail: "email3@email.com",
      memberName: "test member3",
      memberPassword: "Password123!",
      profileStatus: "active",
      userClass: 2,
      eventId,
    };

    const m1Post = await request(app)
      .post("/staffMembers")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send(member1)
      .expect(200);

    const m2Post = await request(app)
      .post("/staffMembers")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send(member2)
      .expect(200);

    const m1: CreateMemberResponse = m1Post.body;
    const m2: CreateMemberResponse = m2Post.body;

    expect(m1.memberId).toBeDefined();
    expect(m2.memberId).toBeDefined();

    createdMemberIds.push(m1.memberId);
    createdMemberIds.push(m2.memberId);
  });

  it("Should reject staff login attempts", async () => {
    //#region REJECT STAFF LOGIN
    await request(app)
      .post("/staffMembers/login")
      .set("Content-Type", "application/json")
      .send({
        memberEmail: "email2@email.com",
        memberPassword: "Password123!",
      })
      .expect(403);
  });

  it("Should get 2 staff members", async () => {
    //#region GET STAFF
    const getResponse = await request(app)
      .get("/staffMembers")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .query(`eventId=${eventId}`)
      .expect(200);

    expect(getResponse.body.length).toBe(2);
  });

  it("Should get a staff member", async () => {
    //#region GET ONE MEMBER
    const getResponse = await request(app)
      .get(`/staffMembers/${createdMemberIds[0]}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    const member: Omit<StaffMember, "memberPassword"> = getResponse.body;

    expect(member.memberId).toBe(createdMemberIds[0]);
  });

  it("Should not get a member", async () => {
    //#region NOT GET MEMBER
    await request(app)
      .get(`/staffMembers/${v4()}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(404);
  });

  it("Should update a staff member", async () => {
    //#region UPDATE MEMBER
    await request(app)
      .patch(`/staffMembers/${createdMemberIds[0]}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send({
        memberName: "Patched Name",
        memberEmail: "email4@email.com",
        profileStatus: "inactive",
        memberPassword: "PassPass123!",
        userClass: 2,
      })
      .expect(200);

    const getMember = await request(app)
      .get(`/staffMembers/${createdMemberIds[0]}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    expect(getMember.body?.memberName).toBe("Patched Name");
  });

  it("Should not update a member", async () => {
    //#region NOT UPDATE
    await request(app)
      .patch(`/staffMembers/${createdMemberIds[0]}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send({
        memberName: "Patched Name",
        memberEmail: "email4@email.com",
        profileStatus: "inactive",
        memberPassword: "PassPass123!",
        userClass: "some-class",
      })
      .expect(200);
  });

  it("Should delete a member", async () => {
    //#region DELETE STAFF
    await request(app)
      .delete(`/staffMembers/${createdMemberIds[0]}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    await request(app)
      .get(`/staffMembers/${createdMemberIds[0]}`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(404);
  });
});
