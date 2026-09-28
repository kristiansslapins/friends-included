# Live homework test sequence and expected answers

All splits below are Richard / Anastasia / Jean-Claude. Amounts are euros. Local automated tests already reproduce these answers, but the sequence below still needs to be performed against the connected live system.

## Test 1

Start with no practice transactions. Start the bot, select Svetlana on the website, and link your Telegram user ID to Richard.

Send this message to the actual Telegram bot:

```text
/sale | S01 | Olivia Rose | A | One proud uncle and an emotional grandmother | 1000 | 50 | 30/20
```

Check the confirmation and the saved S01 record in Supabase, the website and the Sales sheet. In the website's manager setup, relink the same Telegram user ID to Kevin. Then send:

```text
/expense | E01 | Rented suit and fake pearl necklace for the relatives | 120 | Materials | A
```

Use the website role selector for the remaining entries:

| Reference | Employee | Customer or description | Project or allocation | Amount | Split or category |
| --- | --- | --- | --- | ---: | --- |
| S02 | Anastasia | Daniel King — University friends, dancing, and the stripping performance | B | 2000.00 | 0 / 50 / 50 |
| E02 | Kevin | Taxi for the grandmother; Kevin selected the wrong project | B | 80.00 | Travel |
| E03 | Kevin | Monthly company website subscription | Company overhead | 100.00 | Other |

Before approval: approved income €0.00; commission €0.00; both project results €0.00; company result **−€300.00**. E01 and E02 await allocation, E03 is already overhead.

As Svetlana:

- Approve S01 at 50 / 30 / 20.
- Change S02 to 20 / 40 / 40 and approve.
- Allocate E01 to A.
- Change E02 from B to A and confirm.

You must receive S01's approval and E01's allocation notification in your original Telegram chat even though the linked employee changed. For website entries without a linked recipient, the record explicitly says **No Telegram recipient linked**.

| Measure | Project A | Project B | Company |
| --- | ---: | ---: | ---: |
| Approved income | €1000.00 | €2000.00 | €3000.00 |
| Commission expense | €100.00 | €200.00 | €300.00 |
| Allocated project expenses | €200.00 | €0.00 | €200.00 |
| Company overhead | — | — | €100.00 |
| Awaiting allocation | — | — | €0.00 |
| Result | **€700.00** | **€1800.00** | **€2400.00** |

Earned commissions: Richard €90.00, Anastasia €110.00, Jean-Claude €100.00.

Check the actual Sheets rows for S02's original and final splits and E02's original/final allocation. Refresh the app and confirm persistence before continuing.

## Test 2

Keep Test 1 records. Enter the following using the appropriate website roles:

| Reference | Employee | Customer | Description | Project | Amount | Proposed split |
| --- | --- | --- | --- | --- | ---: | --- |
| S03 | Jean-Claude | Emma Stonebridge | Premium relatives, including an uncle presented as a surgeon | A | 1500.00 | 40 / 40 / 20 |
| S04 | Richard | Lucas Green | Small group of loud university friends | B | 800.00 | 25 / 25 / 50 |
| S05 | Richard | Mia Brooks | Extra guests and an embarrassing speech | B | 600.00 | 100 / 0 / 0 |

As Kevin:

| Reference | Description | Category | Amount | Proposed allocation |
| --- | --- | --- | ---: | --- |
| E04 | Replacement costumes after an enthusiastic dance performance | Materials | 250.00 | B |
| E05 | Minibus for university friends; Kevin selected the wrong project again | Travel | 90.00 | A |
| E06 | Company telephone subscription | Other | 60.00 | Company overhead |
| E07 | Emergency replacement clothing; project allocation still needs checking | Materials | 140.00 | A |

Before approving S03, link Jean-Claude to your Telegram account. As Svetlana:

- Change S03 to 20 / 30 / 50 and approve. Verify the changed-split notification: €150.00 pool, Richard €30.00, Anastasia €45.00, Jean-Claude €75.00.
- Approve S04 at 25 / 25 / 50.
- Leave S05 pending.
- Link Kevin to your Telegram account before the next two decisions.
- Confirm E04 to B.
- Change E05 from A to B and confirm. Verify the notification clearly says €90.00 moved from A to B.
- Leave E07 awaiting allocation.

| Measure | Project A | Project B | Company |
| --- | ---: | ---: | ---: |
| Approved income | €2500.00 | €2800.00 | €5300.00 |
| Commission expense | €250.00 | €280.00 | €530.00 |
| Allocated project expenses | €200.00 | €340.00 | €540.00 |
| Company overhead | — | — | €160.00 |
| Awaiting allocation | — | — | €140.00 |
| Result | **€2050.00** | **€2180.00** | **€3930.00** |

| Salesperson | Earned commission |
| --- | ---: |
| Richard | €140.00 |
| Anastasia | €175.00 |
| Jean-Claude | €215.00 |
| Total | **€530.00** |

Reconciliation: **€2050.00 + €2180.00 − €160.00 − €140.00 = €3930.00**.

S05's €600.00 is excluded from income and commissions. E07's €140.00 has already reduced the company result. Neither receives an approval notification while pending.

## Permission and input checks

Use a fresh reference for attempts that are not specifically testing duplicate references. These must all leave financial control totals unchanged:

1. Submit shares 60 / 30 / 20: rejected because they total 110%.
2. Act as Richard and attempt to approve: rejected by the server, even if a request body supplies `actor: "svetlana"`.
3. Act as Kevin and submit a sale: rejected by the server.
4. Submit an expense with missing or zero amount: rejected.
5. Approve an already approved transaction: no-op; no extra commissions or records.
6. Submit S01 again: duplicate reference rejected.

The included HTTP tests exercise server-side restrictions. The interface also restricts visible entry and approval controls by role.

## Live interruption checks

Perform these during Test 1 or Test 2 so no extra financial transactions are needed:

1. Before a scheduled approval such as S02, temporarily change the service account's access to the reporting sheet from Editor to Viewer.
2. Approve S02. The decision must remain saved, totals must update once, and its record must show Sync failed.
3. Restore service-account Editor access. Click Retry incomplete deliveries. The original S02 row must update without a duplicate or changed control totals.
4. Before a scheduled Telegram decision such as S03, block the bot in Telegram. Approve S03. The decision must remain approved and the notification must show failed, never sent.
5. Unblock/start the bot, retry the record, and verify delivery. Financial totals must remain unchanged.

Restore all access after each check. Final review should show 5 sales and 7 expense records, S05 and E07 pending, and all intended Sheets rows synchronized.

## Completion checklist

- [ ] GitHub repository accessible to the instructor.
- [ ] Live Vercel URL displays Kristiāns Šlāpins and all required links.
- [ ] Supabase persists the actual submitted records.
- [ ] S01 and E01 went through the real bot, with confirmations and later decisions.
- [ ] Both live test sequences completed with the cumulative results above.
- [ ] Actual Sheets rows checked, including corrected splits and allocations.
- [ ] Website refreshed; results persist.
- [ ] Server-side permissions and real failure/retry behavior checked.
- [ ] Only your own course spreadsheet Day 4 link cell updated.
