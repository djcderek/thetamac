import assert from "node:assert/strict";
import test from "node:test";

import { leaderboardInitials } from "./leaderboard-initials";

test("guest names use the adjective and animal, not the Guest prefix", () => {
  assert.equal(leaderboardInitials("Guest WildKoala"), "WK");
  assert.equal(leaderboardInitials("Guest SteadyRaven"), "SR");
});

test("people get first and last initials; single words get one letter", () => {
  assert.equal(leaderboardInitials("Maya Chen"), "MC");
  assert.equal(leaderboardInitials("derekchan"), "D");
  assert.equal(leaderboardInitials("math_wiz"), "MW");
  assert.equal(leaderboardInitials(""), "?");
});
