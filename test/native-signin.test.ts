// Sign-in in the Android app (DECISIONS #123): what the app takes from the address it is opened with.
import { describe, expect, it } from "vitest";
import { tokensFrom } from "../src/sync";

describe("sign-in returning to the app", () => {
  it("takes the two tokens from after the #", () => {
    expect(tokensFrom("com.sikhworldchampionship.chess://login#access_token=abc&expires_in=3600&refresh_token=def&token_type=bearer"))
      .toEqual({ access_token: "abc", refresh_token: "def" });
  });
  it("reports an error (an expired link) instead of signing in", () => {
    expect(tokensFrom("com.sikhworldchampionship.chess://login#error=access_denied&error_description=Email+link+is+invalid+or+has+expired"))
      .toEqual({ error: "Email link is invalid or has expired" });
  });
  it("ignores an address with neither", () => {
    expect(tokensFrom("com.sikhworldchampionship.chess://login")).toBeNull();
    expect(tokensFrom("com.sikhworldchampionship.chess://login#access_token=only")).toBeNull();
  });
});
