import format from "pg-format";
import crypto from "bcryptjs";
import { v4 } from "uuid";

const staffKeys = [
  "company",
  "memberEmail",
  "memberId",
  "memberName",
  "profileStatus",
  "userClass",
  "memberPassword",
  "eventId",
];

export function createAdmin() {
  //#region CREATE ADMIN
  const memberPassword = crypto.hashSync("Password123!", 8);
  const memberId = v4();

  return format("INSERT INTO staff_members(%I) VALUES(%L)", staffKeys, [
    "testCompany",
    "email@email.com",
    memberId,
    "Test User",
    "active",
    0,
    memberPassword,
    null,
  ]);
}

export function createBartender(eventId?: string | null) {
  //#region CREATE BARTENDER
  const memberPassword = crypto.hashSync("Password123!", 8);
  const memberId = v4();
  return format("INSERT INTO staff_members(%I) VALUES(%L)", staffKeys, [
    "testCompany",
    "email2@email.com",
    memberId,
    "cashier",
    "active",
    1,
    memberPassword,
    eventId || null,
  ]);
}

export function createCashier(eventId?: string | null) {
  //#region CREATE CASHIER
  const memberPassword = crypto.hashSync("Password123!", 8);
  const memberId = v4();
  return format("INSERT INTO staff_members(%I) VALUES(%L)", staffKeys, [
    "testCompany",
    "email3@email.com",
    memberId,
    "bartender",
    "active",
    2,
    memberPassword,
    eventId || null,
  ]);
}
