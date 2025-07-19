# Documentation

- **Validations**

```jsx
status 401: "No token"
status 403: "Invalid token" | "Forbidden from making requests"
status 410: "Event stopped running"
```

- **Environment**

```jsx
PORT=
PGPORT=
PGHOST=
PGUSER=
PGPASSWORD=
PGDATABASE=
JWT_SECRET=
TOKEN_MAX_AGE=
STAFF_TOKEN_AGE=
ADMIN_CLASS=
ADMIN_NAME_DESCRIPTOR=
```

- **Staff members**

```jsx
get: /staffMembers
	Authorization: token
	Access: Admin
	Query: StaffQuery
	Response: GetStaffResponse

get: /staffMembers/:id
	Authorization: token
	Access: Admin
	Response: GetMemberResponse
	status 404: "No member"

get: /staffMembers/dataRefresh
	Authorization: token
	Response: RefreshDataResponse

post: /staffMembers
	Authorization: token
	Access: Admin
	Body: CreateStaffRequest
	Response: CreateMemberResponse
	status 400: "Missing parameters"
	status 406: "Duplicate email"

patch: /staffMembers/:id
	Authorization: token
	Body: PatchStaffRequest
	Response: PatchMemberResponse
	status 400: "Empty body"
	status 403: "Not same user for update or not admin"

delete: /staffMembers/:id
	Authorization: token
	Access: Admin
	Response: DeleteMemberResponse

post: /staffMembers/login
	Body: MemberLoginRequest
	Response: LoginMemberResponse
	status 400: "Missing credentials"
	status 401: "Invalid credentials"
	status 403: "No running events"

get: /staffMembers/profile
	Authorization: token
	Response: GetMemberResponse
	status 404: "Missing member"
```

- **Events**

```jsx
get: /events
	Authorization: token
	Access: Admin
	Response: GetAllEventsResponse

get: /events/active
	Authorization: token
	Access: Admin
	Response: GetAllEventsResponse

post: /events
	Authorization: token
	Access: Admin
	Body: CreateEventRequest
	Response: CreateEventResponse
	status 400: "Missing required parameters"|"Card price < 0"|"Tag price < 0"|"Ticket price < 0"

get: /events/:id
	Authorization: token
	Access: Admin
	Response: GetEventResponse
	status 404: "Event not found"

patch: /events/:id
	Authorization: token
	Access: Admin
	Body: PatchEventRequest
	Response: PatchEventResponse
	status 400: "Empty body"|"Card price < 0"|"Tag price < 0"

delete: /events/:id
	Authorization: token
	Access: Admin
	Response: DeleteEventResponse
```

- **Transactions**

```jsx
get: /transactions
	Authorization: token
	Access: Admin
	Query: GetTransactionsQuery
	Response: GetTransactionsResponse

post: /transactions
	Authorization: token
	Access: Bartender
	Body: CreateTransactionRequest
	Response: CreateTransactionResponse
	status 400: "Invalid transaction (no amount/quantity, invalid amount/quantity values, no item name)"
	status 403: "Insufficient funds"|"Balance not found"|"Bonus purchase forbidden item"|"Missing conversion rate for balance activation currency"|"Balance not created in events"|"Amount smaller then minimum"
	status 403:

delete: /transactions/:id
	Authorization: token
	Access: Admin
	Response: DeleteTransactionsResponse
```

- **Balances**

```jsx
get: /balances
	Authorization: token
	Query: GetBalancesQuery
	Response: GetBalancesResponse

get: /balances/:scanId
	Authorization: token
	Response: GetBalanceByScanResponse
	status 404: "Balance not found"
	status 404: "Balance wa not registered in event"

post: /balances
	Authorization: token
	Access: Admin | Cashier
	Body: CreateBalanceRequest
	Response: CreateBalanceResponse
	status 403: "Missing scanId"|"Missing activation currency"|"Activation currency not found"|"Missing event default currency"

post: /balances/staffBalance
	Authorization: token
	Access: Cashier | Bartender
	Body: CreateStaffBalanceRequest
	Response: CreateStaffBalanceResponse
	status 403: "Missing scanId" | "Missing admin password" | "Missing activation currency" | "Currency not found"|"Missing event default currency"
	status 404: "Admin not found"
	status 401: "Cannot authenticate admin"

patch: /balances/:id
	Authorization: token
	Access: Admin
	Body: PatchBalanceRequest
	Response: PatchBalanceResponse
	status 400: "Empty body"|"Invalid balance"


delete: /balances/:id
	Authorization: token
	Access: Admin
	Response: DeleteBalanceResponse
	status 404: "Balance not found"
	status 403: "Cannot delete client balance"

delete: /balances/event/:id
	Authorization: token
	Access: Admin
	Response: DeleteBalanceResponse
```

- **Items**

```jsx
get: /events/:id/items
	Authorization: token
	Access: Admin
	Response: GetItemsResponse

post: /events/:id/items
	Authorization: token
	Access: Admin
	Body: PostItemsRequest
	Response: PostItemsResponse
	status 400: "Empty body"

patch: /events/:id/items
	Authorization: token
	Access: Admin
	Query: PatchItemQuery
	Body: PatchItemRequest
	Response: PatchItemsResponse
	status 400: "No itemName" | "Empty Body"

delete: /events/:id/items
	Authorization: token
	Access: Admin
	Query: DeleteItemQuery
	Response: DeleteItemResponse
```

- **Stands**

```jsx
get: /events/:id/stands
	Authorization: token
	Access: Admin
	Response: GetStandsResponse

post: /events/:id/stands
	Authorization: token
	Access: Admin
	Query: PatchItemQuery
	Body: CreateStandRequest
	Response: CreateStandResponse
	status 400: "Missing stand name"

patch: /events/:id/stands
	Authorization: token
	Access: Admin
	Query: PatchStandQuery
	Body: PatchStandRequest
	Response: PatchStandResponse
	status 400: "Missing standName" | "Empty body"

delete: /events/:id/stands
	Authorization: token
	Access: Admin
	Query: DeleteStandQuery
	Response: DeleteStandResponse
	status 400: "Missing stand name query"
```

- **Clients**

```jsx
get: /clients
	Authorization: token
	Access: Admin | Cashier
	Query: GetClientQuery
	Response: GetClientResponse

post: /clients
	Authorization: token
	Access: Cashier
	Body: CreateClientRequest
	Response: CreateClientResponse
	status 403: "Missing required body parameters"|"Missing event default currency"
	status 406: "Duplicate email or scanId or ticketId",

patch: /clients/:clientId
	Authorization: token
	Access: Admin | Cashier
	Body: PatchClientRequest
	Response: PatchClientResponse
	status 400: "Empty body"

delete: /clients/:clientId
	Authorization: token
	Access: Admin | Cashier
	Response: DeleteClientResponse
	status 404: "Client not found" | "Client balance not found"
```

- **Top Ups**

```jsx
get: /topUps
	Authorization: token
	Access: Admin
	Query: GetTopUpsQuery
	Response: GetTopUpsResponse
	status 400: "Missing eventId query"

post: /topUps
	Authorization: token
	Access: Cashier
	Body: TopUpRequest
	Response: CreateTopUpResponse
	status 400: "Empty body"|"No event id"|"Staff trying to top up bonus balance"
	status 403: "Invalid amount"|"No scanId or ticketId"|"Admin top up regular balance"|"Currencies errors"
```

- **Analytics**

```jsx
get: /events/:eventId/analytics
	Authorization: token
	Access: Admin
	Response: GetEventAnalyticsResponse
	status 404: "No analytics"

post: /events/:eventId/analytics
	Authorization: token
	Access: Admin
	Response: GetEventAnalyticsResponse,
```

- **Export**

```jsx
get: /events/:eventId/exports
	Authorization: token
	Access: Admin
	Response: GetEventExportResponse

get: /events/:eventId/exportAnalytics
	Authorization: token
	Access: Admin
	Response: GetEventExportAnalyticsResponse

get: /events/:eventId/report
	Authorization: token
	Access: Admin
	Response: GetEventReportResponse
	status 404: "Report not found"

get: /reports
	Authorization: token
	Access: Admin
	Response: GetAllReportsResponse
```

- **Currencies**

```jsx
get: /events/:eventId/currencies
	Authorization: token
	Access: Admin|Cashier
	Response: GetCurrenciesResponse
	status 400: "Cannot get currencies of other events"

post: /events/:eventId/currencies
	Authorization: token
	Access: Admin
	Body: CreateCurrencyRequest
	Response: CreateCurrenciesResponse
	status 400: "Invalid rate"|"Currency with no name"|"Multiple defaults per event"|"Duplicated names"|"Empty body"|"Invalid quick prices"
	status 403: "Duplicated name"|"Duplicated default"
```

- **Tickets**

```jsx
post: /check-ticket
	Authorization: token
	Access: Door
	Body: CheckTicketRequest
	Response: CheckTicketRequest
	status 403: "Invalid or missing ticket"|"Ticket not of this event"|"Ticket already checked"
```
