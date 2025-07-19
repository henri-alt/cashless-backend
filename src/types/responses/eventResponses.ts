import { EventType } from "../tableTypes";

export type GetAllEventsResponse = EventType[];

export type CreateEventResponse = { eventId: string };

export type GetEventResponse = EventType;

export type PatchEventResponse = void;

export type DeleteEventResponse = void;
