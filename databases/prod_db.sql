SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
CREATE DATABASE cashless_prod WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.UTF-8';
\ connect cashless_prod
SET default_tablespace = '';
SET default_table_access_method = heap;
CREATE TABLE public.balances (
    balance numeric DEFAULT 0 NOT NULL,
    "ticketId" text,
    "scanId" text NOT NULL,
    "eventId" uuid,
    "balanceId" uuid NOT NULL,
    "isFidelityCard" boolean DEFAULT false NOT NULL,
    "memberId" uuid,
    company text NOT NULL,
    "createdAt" timestamp with time zone,
    "createdBy" text,
    "initialAmount" numeric DEFAULT 0,
    "isBonus" boolean DEFAULT false NOT NULL,
    "activationCost" numeric DEFAULT 0,
    "eventCreated" uuid,
    "activationCurrency" text,
    "createdById" uuid,
    "eventCurrency" text
);
CREATE TABLE public.clients (
    "clientId" uuid NOT NULL,
    "clientEmail" text NOT NULL,
    "clientName" text NOT NULL,
    "balanceId" uuid NOT NULL,
    company text NOT NULL,
    "createdAt" timestamp with time zone,
    "amountSpent" numeric DEFAULT 0
);
CREATE TABLE public.companies (
    "companyId" uuid NOT NULL,
    company text NOT NULL,
    "companyStatus" text DEFAULT 'active'::text,
    "createdAt" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "tenantId" uuid
);
CREATE TABLE public.currencies (
    company text NOT NULL,
    "eventId" uuid NOT NULL,
    currency text NOT NULL,
    rate numeric NOT NULL,
    "isDefault" boolean NOT NULL,
    "currencyId" uuid NOT NULL,
    "quickPrices" numeric [] DEFAULT ARRAY []::numeric [],
    "marketRate" numeric DEFAULT 0
);
CREATE TABLE public.event_analytics (
    "eventId" uuid NOT NULL,
    "analyticId" uuid NOT NULL,
    "totalRevenue" numeric DEFAULT 0 NOT NULL,
    "totalTransactions" numeric DEFAULT 0 NOT NULL,
    "totalItemsSold" numeric DEFAULT 0 NOT NULL,
    "staffTransactions" numeric DEFAULT 0 NOT NULL,
    "staffTransactionsTotal" numeric DEFAULT 0 NOT NULL,
    "mostSoldItem" text,
    "mostUsedStand" text,
    "bestCustomer" uuid,
    "averageExpense" numeric DEFAULT 0 NOT NULL,
    "highestAmountSpent" numeric DEFAULT 0 NOT NULL,
    company text NOT NULL,
    "itemsTakenFromStaff" numeric DEFAULT 0 NOT NULL,
    "topUps" numeric DEFAULT 0,
    "topUpsTotalAmount" numeric DEFAULT 0
);
CREATE TABLE public.event_exports (
    "eventId" uuid NOT NULL,
    company text NOT NULL,
    "fileData" bytea NOT NULL,
    "lastUpdate" timestamp with time zone NOT NULL,
    "fileName" text,
    "exportId" uuid NOT NULL,
    "eventName" text,
    "startDate" timestamp with time zone
);
CREATE TABLE public.events (
    "eventId" uuid NOT NULL,
    "eventName" text NOT NULL,
    "eventDescription" text,
    "startDate" timestamp with time zone NOT NULL,
    "eventStatus" text DEFAULT 'inactive'::text NOT NULL,
    company text NOT NULL,
    "tagPrice" numeric DEFAULT 0,
    "cardPrice" numeric DEFAULT 0,
    "ticketPrice" numeric DEFAULT 0,
    "activationMinimum" numeric DEFAULT 0,
    "ticketingEventId" uuid
);
CREATE TABLE public.item_configs (
    "itemName" text NOT NULL,
    "itemPrice" numeric NOT NULL,
    "staffPrice" numeric DEFAULT 0 NOT NULL,
    "eventId" uuid NOT NULL,
    "itemTax" numeric DEFAULT 0 NOT NULL,
    "staffSold" integer DEFAULT 0 NOT NULL,
    "clientsSold" integer DEFAULT 0 NOT NULL,
    company text NOT NULL,
    "itemCategory" text NOT NULL,
    "bonusAvailable" boolean DEFAULT true
);
CREATE TABLE public.staff_members (
    "memberName" text NOT NULL,
    "memberId" uuid NOT NULL,
    "memberEmail" text NOT NULL,
    "memberPassword" text NOT NULL,
    "profileStatus" text NOT NULL,
    "userClass" integer NOT NULL,
    company text NOT NULL,
    "eventId" uuid,
    "superAdmin" boolean NOT NULL DEFAULT false
);
CREATE TABLE public.stand_configs (
    "standName" text NOT NULL,
    "eventId" uuid NOT NULL,
    "menuItems" text [],
    "staffMembers" uuid [],
    company text NOT NULL
);
CREATE TABLE public.tickets (
    ticket text NOT NULL,
    "checkTime" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "memberId" uuid NOT NULL,
    "eventId" uuid NOT NULL,
    "memberName" text,
    company text NOT NULL
);
CREATE TABLE public.top_ups (
    "topUpDate" timestamp with time zone NOT NULL,
    "topUpAmount" numeric NOT NULL,
    "memberId" uuid NOT NULL,
    "eventId" uuid NOT NULL,
    company text NOT NULL,
    "memberName" text,
    "scanId" text NOT NULL,
    "topUpId" uuid NOT NULL,
    "topUpCurrency" text
);
CREATE TABLE public.transactions (
    amount numeric NOT NULL,
    "memberId" uuid NOT NULL,
    "itemName" text NOT NULL,
    "transactionDate" timestamp with time zone NOT NULL,
    quantity integer NOT NULL,
    "eventId" uuid NOT NULL,
    company text NOT NULL,
    "scanId" text NOT NULL,
    "transactionId" uuid NOT NULL,
    "memberName" text
);
ALTER TABLE ONLY public.balances
ADD CONSTRAINT balances_pkey PRIMARY KEY ("balanceId");
ALTER TABLE ONLY public.balances
ADD CONSTRAINT "balances_scanId_key" UNIQUE ("scanId");
ALTER TABLE ONLY public.balances
ADD CONSTRAINT "balances_ticketId_key" UNIQUE ("ticketId");
ALTER TABLE ONLY public.clients
ADD CONSTRAINT "clients_clientEmail_key" UNIQUE ("clientEmail");
ALTER TABLE ONLY public.clients
ADD CONSTRAINT clients_pkey PRIMARY KEY ("clientId");
ALTER TABLE ONLY public.companies
ADD CONSTRAINT companies_company_key UNIQUE (company);
ALTER TABLE ONLY public.companies
ADD CONSTRAINT companies_pkey PRIMARY KEY ("companyId");
ALTER TABLE ONLY public.currencies
ADD CONSTRAINT currencies_pkey PRIMARY KEY ("currencyId");
ALTER TABLE ONLY public.staff_members
ADD CONSTRAINT email UNIQUE ("memberEmail");
ALTER TABLE ONLY public.event_analytics
ADD CONSTRAINT event_analytics_pkey PRIMARY KEY ("analyticId");
ALTER TABLE ONLY public.currencies
ADD CONSTRAINT event_currency UNIQUE (currency, "eventId");
ALTER TABLE ONLY public.event_exports
ADD CONSTRAINT "event_exports_eventId_key" UNIQUE ("eventId");
ALTER TABLE ONLY public.event_exports
ADD CONSTRAINT "event_exports_exportId_key" UNIQUE ("exportId");
ALTER TABLE ONLY public.events
ADD CONSTRAINT events_pkey PRIMARY KEY ("eventId");
ALTER TABLE ONLY public.item_configs
ADD CONSTRAINT item_key PRIMARY KEY ("itemName", "eventId");
ALTER TABLE ONLY public.staff_members
ADD CONSTRAINT staff_members_pkey PRIMARY KEY ("memberId");
ALTER TABLE ONLY public.stand_configs
ADD CONSTRAINT stand_key PRIMARY KEY ("standName", "eventId");
ALTER TABLE ONLY public.tickets
ADD CONSTRAINT tickets_pkey PRIMARY KEY (ticket);
ALTER TABLE ONLY public.top_ups
ADD CONSTRAINT top_ups_pkey PRIMARY KEY ("topUpId");
ALTER TABLE ONLY public.transactions
ADD CONSTRAINT transactions_pkey PRIMARY KEY ("transactionId");
ALTER TABLE ONLY public.event_analytics
ADD CONSTRAINT unique_event_id UNIQUE ("eventId");
CREATE INDEX event_id ON public.events USING btree ("eventId");
CREATE INDEX eventids_ids ON public.balances USING btree ("eventId");
CREATE INDEX member_id ON public.transactions USING btree ("memberId");
CREATE INDEX member_ids ON public.balances USING btree ("memberId");
CREATE UNIQUE INDEX scan_ids ON public.balances USING btree ("scanId");
ALTER TABLE ONLY public.clients
ADD CONSTRAINT balance_id FOREIGN KEY ("balanceId") REFERENCES public.balances("balanceId");
ALTER TABLE ONLY public.balances
ADD CONSTRAINT "balances_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public.events("eventId");
ALTER TABLE ONLY public.balances
ADD CONSTRAINT "balances_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public.staff_members("memberId");
ALTER TABLE ONLY public.tickets
ADD CONSTRAINT checked_foreign FOREIGN KEY ("memberId") REFERENCES public.staff_members("memberId");
ALTER TABLE ONLY public.tickets
ADD CONSTRAINT event_foreign FOREIGN KEY ("eventId") REFERENCES public.events("eventId");
ALTER TABLE ONLY public.staff_members
ADD CONSTRAINT event_id FOREIGN KEY ("eventId") REFERENCES public.events("eventId");
ALTER TABLE ONLY public.event_analytics
ADD CONSTRAINT event_id FOREIGN KEY ("eventId") REFERENCES public.events("eventId");
ALTER TABLE ONLY public.top_ups
ADD CONSTRAINT event_id FOREIGN KEY ("eventId") REFERENCES public.events("eventId");
ALTER TABLE ONLY public.currencies
ADD CONSTRAINT event_id FOREIGN KEY ("eventId") REFERENCES public.events("eventId");
ALTER TABLE ONLY public.item_configs
ADD CONSTRAINT item_configs_eventid_fkey FOREIGN KEY ("eventId") REFERENCES public.events("eventId");
ALTER TABLE ONLY public.top_ups
ADD CONSTRAINT member_id FOREIGN KEY ("memberId") REFERENCES public.staff_members("memberId");
ALTER TABLE ONLY public.stand_configs
ADD CONSTRAINT stand_configs_eventid_fkey FOREIGN KEY ("eventId") REFERENCES public.events("eventId");
ALTER TABLE ONLY public.transactions
ADD CONSTRAINT transactions_eventid_fkey FOREIGN KEY ("eventId") REFERENCES public.events("eventId");
ALTER TABLE ONLY public.transactions
ADD CONSTRAINT transactions_memberid_fkey FOREIGN KEY ("memberId") REFERENCES public.staff_members("memberId");