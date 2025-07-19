import { Request, Response } from "express";
import { v4 } from "uuid";
import crypto from "bcryptjs";
import tokens from "jsonwebtoken";
import { initClient, query } from "../providers";
import {
  eventModel,
  staffModel,
  companyModel,
  currenciesModel,
} from "../models";
import {
  Company,
  EventType,
  ItemConfig,
  StaffMember,
  CurrencyType,
  StandConfigType,
  MemberLoginRequest,
  CreateStaffRequest,
  PatchStaffRequest,
} from "../types";

export async function getStaffController(req: Request, res: Response) {
  //#region GET STAFF
  const company: string = res.locals?.company;
  const eventId: string | undefined = req.query?.eventId as string | undefined;
  const userClass: number = Number(req.query?.userClass);

  try {
    const queryRes = await query(
      staffModel.getStaffModel(company, eventId, userClass)
    );

    res.status(200).send(queryRes.rows);
  } catch (err) {
    console.log("Get staff error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function getMemberController(req: Request, res: Response) {
  //#region GET MEMBER
  const { id } = req.params;
  const company: string = res.locals?.company;

  try {
    const queryRes = await query(staffModel.getMemberModel(id, company));

    const [member] = queryRes.rows;
    if (!member) {
      res.status(404).json("Staff member not found");
      return;
    }

    res.status(200).send(member);
  } catch (err) {
    console.log("Member error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function createMemberController(req: Request, res: Response) {
  //#region CREATE MEMBER
  const company: string = res.locals?.company;

  const {
    memberEmail,
    memberName,
    memberPassword,
    profileStatus,
    userClass,
    eventId,
  }: CreateStaffRequest = req.body;

  if (
    !memberName ||
    !memberEmail ||
    !memberPassword ||
    isNaN(+userClass) ||
    !company ||
    !profileStatus ||
    !eventId
  ) {
    res.status(400).json("Missing required body parameters");
    return;
  }

  try {
    const memberId = v4();
    const passwordHash = await crypto.hash(memberPassword, 8);

    await query(
      staffModel.createMemberModel({
        memberEmail,
        memberName,
        profileStatus,
        userClass,
        company,
        memberId,
        memberPassword: passwordHash,
        eventId,
        superAdmin: false,
      })
    );

    res.status(200).send({ memberId });
  } catch (err) {
    console.log("Create member error:\n\n", err);

    if (err instanceof Error) {
      if (
        err.message.includes("duplicate key value") &&
        err.message.includes("email")
      ) {
        res
          .status(406)
          .json(`Staff with email "${memberEmail}" already exists`);
        return;
      }
    }

    res.status(500).send(err);
  }
}

export async function patchMemberController(req: Request, res: Response) {
  //#region PATCH MEMBER
  const { id } = req.params;
  const company: string = res.locals?.company;

  const memberId: string = res.locals?.memberId;
  const userClass: number = res.locals?.userClass;

  if (memberId !== id) {
    if (userClass !== Number(process.env.ADMIN_CLASS)) {
      res
        .status(403)
        .json("Cannot update another user if you are not an admin");
      return;
    }
  }

  const {
    memberName,
    memberEmail,
    profileStatus,
    memberPassword,
    userClass: patchedClass,
  }: PatchStaffRequest = req.body;

  if (
    !company &&
    !memberName &&
    !memberPassword &&
    !profileStatus &&
    !memberEmail &&
    isNaN(patchedClass)
  ) {
    res.status(400).json("Bad request! Empty body");
    return;
  }

  try {
    const queryString = await staffModel.updateMemberModel(
      {
        memberName,
        memberEmail,
        profileStatus,
        memberPassword,
        userClass: patchedClass,
      },
      id
    );
    await query(queryString);

    res.status(200).send();
  } catch (err) {
    if (err instanceof Error) {
      if (
        err.message.includes("duplicate key value") &&
        err.message.includes("email")
      ) {
        res
          .status(406)
          .json(`Staff with email "${memberEmail}" already exists`);
        return;
      }
    }

    console.log("Update member error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function deleteMemberController(req: Request, res: Response) {
  //#region DELETE STAFF
  const { id } = req.params;
  const company: string = res.locals?.company;
  let client;

  try {
    client = await initClient();

    await client.query("BEGIN");
    await client.query(staffModel.deleteMemberModel(id, company));
    await client.query(staffModel.removeMemberFromStandModel(id, company));
    await client.query("COMMIT");

    res.status(200).send();
  } catch (err) {
    console.log("Delete staff error:\n\n", err);
    if (client) {
      await client.query("ROLLBACK");
    }

    res.status(500).send(err);
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function memberRefreshController(req: Request, res: Response) {
  //#region REFRESH
  const memberId: string = res.locals?.memberId;
  const userClass: number = Number(res.locals?.userClass);
  const company: string = res.locals?.company;
  const eventId: string = res.locals?.eventId;

  const companyRes = await query<Company>(
    companyModel.getCompanyByName({ company })
  );

  if (!companyRes.rowCount) {
    res.status(403).json("User is not linked to any company");
    return;
  }

  try {
    if (userClass === +process.env.ADMIN_CLASS) {
      const memberRes = await query<StaffMember>(
        staffModel.getProfileModel(memberId)
      );

      const newToken = tokens.sign(
        {
          memberId: memberId,
          userClass: userClass,
          company: company,
          memberName: memberRes.rows.at(0).memberName,
          eventId,
          tenantId: companyRes.rows.at(0).tenantId || null,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.TOKEN_MAX_AGE,
        }
      );

      res.status(200).send({
        token: newToken,
        member: memberRes.rows.at(0),
      });
    } else {
      if (userClass === 1) {
        const [stand] = (
          await query<StandConfigType>(
            staffModel.checkActiveEventModel(memberId)
          )
        ).rows;
        const { menuItems: standItemNames } = stand;

        const [evRes, itemsRes, memberRes] = await Promise.all([
          query<EventType>(eventModel.getSingleEventModel(eventId)),
          query<ItemConfig>(
            staffModel.getMenuItemsModel(standItemNames, eventId)
          ),
          query<StaffMember>(staffModel.getProfileModel(memberId)),
        ]);

        const menuItems = itemsRes.rows.reduce(
          (acc, val) => ({
            ...acc,
            [val.itemCategory]: [...(acc?.[val.itemCategory] || []), val],
          }),
          {} as Record<string, ItemConfig[]>
        );

        const newToken = tokens.sign(
          {
            memberId: memberId,
            userClass: memberRes.rows.at(0).userClass,
            company: company,
            memberName: memberRes.rows.at(0).memberName,
            eventId,
            tenantId: companyRes.rows.at(0).tenantId || null,
          },
          process.env.JWT_SECRET,
          {
            expiresIn: process.env.STAFF_TOKEN_AGE,
          }
        );

        res.status(200).send({
          token: newToken,
          member: memberRes.rows.at(0),
          menuItems,
          eventId,
          event: evRes.rows.at(0),
          currencies: [],
        });
      } else {
        const [evRes, currenciesRes, memberRes] = await Promise.all([
          query<EventType>(eventModel.getSingleEventModel(eventId)),
          query<ItemConfig>(
            currenciesModel.getCurrenciesModel(eventId, company)
          ),
          query<StaffMember>(staffModel.getProfileModel(memberId)),
        ]);

        const newToken = tokens.sign(
          {
            memberId: memberId,
            userClass: memberRes.rows.at(0).userClass,
            company: company,
            memberName: memberRes.rows.at(0).memberName,
            eventId,
            tenantId: companyRes.rows.at(0).tenantId || null,
          },
          process.env.JWT_SECRET,
          {
            expiresIn: process.env.STAFF_TOKEN_AGE,
          }
        );

        res.status(200).send({
          token: newToken,
          member: memberRes.rows.at(0),
          menuItems: {},
          eventId,
          event: evRes.rows.at(0),
          currencies: currenciesRes.rows,
        });
      }
    }
  } catch (err) {
    console.log("Refresh error:\n\n", err);

    res.status(500).send(err);
  }
}

export async function memberLoginController(req: Request, res: Response) {
  //#region LOGIN
  let client;
  const { memberEmail, memberPassword }: MemberLoginRequest = req.body;
  if (!memberEmail || !memberPassword) {
    res.status(400).json("Bad request! Missing credentials");
    return;
  }

  try {
    client = await initClient();
    const queryRes = await client.query<StaffMember>(
      staffModel.loginMemberModel(memberEmail)
    );

    const [member] = queryRes.rows;
    if (!member) {
      res.status(401).json("Invalid credentials");
      return;
    }

    const { memberPassword: hash, ...rest } = member;

    const verify = await crypto.compare(memberPassword, hash);
    if (!verify) {
      res.status(401).json("Invalid credentials");
      return;
    }

    let menuItems: Record<string, ItemConfig[]> = {};
    let eventId: string = "";
    let event: EventType;
    let currencies: CurrencyType[] = [];

    const companyRes = await client.query<Company>(
      companyModel.getCompanyByName({
        company: rest.company,
      })
    );

    if (!companyRes.rowCount) {
      res.status(403).json("User is not linked to any company");
      return;
    }

    if (rest.userClass !== +process.env.ADMIN_CLASS) {
      // in this case we want to check whether there are any "active" events
      // if this user is not assigned to an event they cannot login
      const standQuery = await client.query<StandConfigType>(
        staffModel.checkActiveEventModel(rest.memberId)
      );

      if (!standQuery.rowCount) {
        res.status(403).json("Cannot login. No running events for member");
        return;
      }

      const [stand] = standQuery.rows;
      const { menuItems: standItemNames } = stand;
      eventId = stand.eventId;

      const eventRes = await query<EventType>(
        eventModel.getSingleEventModel(eventId)
      );
      event = eventRes.rows[0];

      // if (rest.userClass === 1) {
      const itemsQuery = await client.query<ItemConfig>(
        staffModel.getMenuItemsModel(standItemNames, eventId)
      );

      menuItems = itemsQuery.rows.reduce(
        (acc, val) => ({
          ...acc,
          [val.itemCategory]: [...(acc?.[val.itemCategory] || []), val],
        }),
        {} as Record<string, ItemConfig[]>
      );
      // } else {
      const currenciesRes = await client.query<CurrencyType>(
        currenciesModel.getCurrenciesModel(eventId, rest.company)
      );

      currencies = currenciesRes.rows;
      // }
    }

    const token = tokens.sign(
      {
        memberId: rest.memberId,
        userClass: rest.userClass,
        company: rest.company,
        memberName: rest.memberName,
        eventId,
        tenantId: companyRes.rows.at(0).tenantId || null,
      },
      process.env.JWT_SECRET,
      {
        expiresIn:
          rest.userClass === Number(process.env.ADMIN_CLASS)
            ? process.env.TOKEN_MAX_AGE
            : process.env.STAFF_TOKEN_AGE,
      }
    );

    if (rest.userClass !== +process.env.ADMIN_CLASS) {
      res
        .status(200)
        .send({ token, member: rest, menuItems, eventId, event, currencies });
    } else {
      res.status(200).send({ token, member: rest });
    }
  } catch (err) {
    console.log("Login error:\n\n", err);
    if (client) {
      await client.query("ROLLBACK");
    }

    res.status(500).send(err);
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function getProfileController(req: Request, res: Response) {
  //#region GET PROFILE
  const memberId: string = res.locals?.memberId;

  try {
    const queryRes = await query<PatchStaffRequest>(
      staffModel.getProfileModel(memberId)
    );

    const [member] = queryRes.rows;

    if (!member) {
      res.status(404).json("Staff member was not fond");
      return;
    }

    res.status(200).send(member);
  } catch (err) {
    console.log("Profile error:\n\n", err);
    res.status(500).send(err);
  }
}
