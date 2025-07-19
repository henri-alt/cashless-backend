import format from "pg-format";
import crypto from "bcryptjs";
import { StaffMember, PatchStaffRequest } from "../types";

const idKey = "memberId";

const allowedKeys: (keyof Omit<StaffMember, "memberPassword">)[] = [
  "company",
  "memberEmail",
  idKey,
  "memberName",
  "profileStatus",
  "userClass",
  "eventId",
  "superAdmin",
];

const allKeys: (keyof StaffMember)[] = [...allowedKeys, "memberPassword"];

export function getStaffModel(
  company: string,
  eventId?: string,
  userClass?: number
) {
  //#region GET STAFF
  let filters = [
    format("%I<>%L", "userClass", +process.env.ADMIN_CLASS),
    format("%I=%L", "company", company),
  ];

  if (eventId) {
    filters.push(format("%I=%L", "eventId", eventId));
  }

  if (!isNaN(+userClass)) {
    filters.push(format("%I=%L", "userClass", +userClass));
  }

  const query = format(`SELECT %I FROM staff_members WHERE `, allowedKeys);

  return query + filters.join(" AND ");
}

export function getMemberModel(id: string, company: string) {
  //#region GET MEMBER
  return format(
    "SELECT %I FROM staff_members WHERE %I=%L AND %I=%L",
    allowedKeys,
    idKey,
    id,
    "company",
    company
  );
}

export function createMemberModel(body: StaffMember) {
  //#region CREATE MEMBER
  return format("INSERT INTO staff_members(%I) VALUES(%L)", allKeys, [
    body.company,
    body.memberEmail,
    body.memberId,
    body.memberName,
    body.profileStatus,
    body.userClass,
    body.eventId,
    body.superAdmin,
    body.memberPassword,
  ]);
}

export async function updateMemberModel(body: PatchStaffRequest, id: string) {
  //#region UPDATE MEMBER
  const { userClass, memberName, memberEmail, profileStatus, memberPassword } =
    body;

  let updateQuery = `UPDATE staff_members SET `;
  let updates = [];
  if (memberPassword) {
    let passwordHash = await crypto.hash(memberPassword, 8);
    updates.push(format("%I=%L", "memberPassword", passwordHash));
  }

  if (memberName) {
    updates.push(format("%I=%L", "memberName", memberName));
  }

  if (memberEmail) {
    updates.push(format("%I=%L", "memberEmail", memberEmail));
  }

  if (profileStatus) {
    updates.push(format("%I=%L", "profileStatus", profileStatus));
  }

  if (!isNaN(userClass)) {
    updates.push(format("%I=%L", "userClass", userClass));
  }

  return updateQuery + updates.join(", ") + format(" WHERE %I=%L", idKey, id);
}

export function deleteMemberModel(id: string, company: string) {
  //#region DELETE MEMBER
  return format(
    "DELETE FROM staff_members WHERE %I=%L AND %I=%L",
    idKey,
    id,
    "company",
    company
  );
}

export function loginMemberModel(memberEmail: string) {
  //#region LOGIN
  return format(
    "SELECT %I FROM staff_members WHERE %I=%L",
    allKeys,
    "memberEmail",
    memberEmail
  );
}

export function getProfileModel(memberId: string) {
  //#region GET PROFILE
  return format(
    "SELECT %I FROM staff_members WHERE %I=%L",
    allKeys,
    "memberId",
    memberId
  );
}

export function checkActiveEventModel(memberId: string) {
  return format(
    `SELECT * FROM stand_configs s WHERE %L=any(s.%I) AND EXISTS (SELECT %I FROM events e WHERE s.%I=e.%I and e.%I=%L)`,
    memberId,
    "staffMembers",
    "eventId",
    "eventId",
    "eventId",
    "eventStatus",
    "active"
  );
}

export function getMenuItemsModel(names: string[], eventId: string) {
  //#region MENU ITEMS
  if (!names.length) {
    return format("SELECT * FROM item_configs WHERE %I=%L", "eventId", eventId);
  }

  return format(
    "SELECT * FROM item_configs WHERE %I=%L AND %I IN (%L)",
    "eventId",
    eventId,
    "itemName",
    names
  );
}

export function removeMemberFromStandModel(memberId: string, company: string) {
  //#region REMOVE FROM STAND
  return format(
    "UPDATE stand_configs SET %I=array_remove(%I, %L) WHERE %I=%L AND %L = ANY(%I)",
    "staffMembers",
    "staffMembers",
    memberId,
    "company",
    company,
    memberId,
    "staffMembers"
  );
}
