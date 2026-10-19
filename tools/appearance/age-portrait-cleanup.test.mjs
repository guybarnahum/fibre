import test from "node:test";
import assert from "node:assert/strict";
import {parseOperatorEnv} from "../deployment/cloudflare-operator.mjs";
import {parseAgePortraitCleanupArgs,cleanupAccessToken} from "./age-portrait-cleanup.mjs";

test("operator file supplies Access identity without treating Cloudflare API credentials as Admin access",()=>{
  const args=parseAgePortraitCleanupArgs([
    "--env","staging","--thread-id","thr_visual","--file",".env",
  ]);
  assert.equal(args.file,".env");
  assert.equal(args.execute,false,"Cleanup must remain dry-run by default");
  const config=parseOperatorEnv("CLOUDFLARE_API_TOKEN=management-only\nFIBRE_ADMIN_ACCESS_TOKEN=access-jwt\n");
  assert.equal(cleanupAccessToken(config,{}),"access-jwt",
    "Cleanup did not use the Access identity from the operator file");
  assert.equal(cleanupAccessToken({CLOUDFLARE_API_TOKEN:"management-only"},{}),null,
    "Management credentials were mistaken for an Admin Access JWT");
  assert.equal(parseAgePortraitCleanupArgs([
    "--env","staging","--thread-id","thr_visual","--file",".env","--execute",
  ]).execute,true,"Explicit execute was ignored");
});
