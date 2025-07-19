import request from "supertest";
import app from "../app";
import { prepareDb } from "./fixtures/startDb";
import { closePool } from "../providers/poolProvider";
import {
  LoginMemberResponse,
  StaffMember,
  PostItemsRequest,
  GetItemsResponse,
  PatchItemRequest,
} from "../types";

let admin: Omit<StaffMember, "memberPassword">;
let adminToken: string;
let eventId: string;

describe("Menu items routes", () => {
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

  it("Should get the event items", async () => {
    //#region GET ITEM
    const getItemResponse = await request(app)
      .get(`/events/${eventId}/items`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    expect(getItemResponse.body?.length).toBe(2);
  });

  it("Should mass update and add items", async () => {
    //#region MASS UPDATES

    const items: PostItemsRequest = [
      {
        clientsSold: 0,
        itemCategory: "drinks",
        itemName: "cola",
        itemPrice: 20,
        itemTax: 2,
        staffPrice: 14,
        bonusAvailable: true,
      },
      {
        clientsSold: 0,
        itemCategory: "drinks",
        itemName: "water",
        itemPrice: 20,
        itemTax: 3,
        staffPrice: 20,
        bonusAvailable: true,
      },
      {
        clientsSold: 0,
        itemCategory: "snacks",
        itemName: "croissant",
        itemPrice: 4,
        itemTax: 0,
        staffPrice: 3,
        bonusAvailable: true,
      },
    ];

    await request(app)
      .post(`/events/${eventId}/items`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .send(items)
      .expect(200);

    const getItemResponse = await request(app)
      .get(`/events/${eventId}/items`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    expect(getItemResponse.body?.length).toBe(3);

    const cola = (getItemResponse.body as GetItemsResponse).find(
      ({ itemName }) => itemName === "cola"
    );

    const croissant = (getItemResponse.body as GetItemsResponse).find(
      ({ itemName }) => itemName === "croissant"
    );

    expect(cola).toBeDefined();
    expect(cola.itemPrice).toBe(20);

    expect(croissant).toBeDefined();
    expect(croissant.itemPrice).toBe(4);
  });

  it("Should update a single item", async () => {
    //#region UPDATE SINGLE ITEM
    const updateBody: PatchItemRequest = {
      itemCategory: "sodas",
      itemName: "coca cola",
      itemPrice: 22,
      itemTax: 3,
      staffPrice: 20,
    };

    await request(app)
      .patch(`/events/${eventId}/items`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .query("itemName=cola")
      .send(updateBody)
      .expect(200);

    const itemResponse = await request(app)
      .get(`/events/${eventId}/items`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    const items: GetItemsResponse = itemResponse.body;

    expect(items.find(({ itemName }) => itemName === "cola")).not.toBeDefined();
    const updated = items.find(({ itemName }) => itemName === "coca cola");
    expect(updated).toBeDefined();
    expect(updated.itemPrice).toBe(22);
  });

  it("Should delete one item", async () => {
    //#region DELETE ITEM
    await request(app)
      .delete(`/events/${eventId}/items`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .query("itemName=coca cola")
      .expect(200);

    const itemResponse = await request(app)
      .get(`/events/${eventId}/items`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    const items: GetItemsResponse = itemResponse.body;
    expect(items.length).toBe(2);
  });

  it("Should delete all event items", async () => {
    //#region DELETE EVENT ITEMS
    await request(app)
      .delete(`/events/${eventId}/items`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    const itemResponse = await request(app)
      .get(`/events/${eventId}/items`)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer " + adminToken)
      .expect(200);

    const items: GetItemsResponse = itemResponse.body;
    expect(items.length).toBe(0);
  });
});
