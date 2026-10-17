import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveGeoNamesPlace,
  resolveGeoNamesLocality,
  reverseGeoNamesPlace,
  searchGeoNamesPlaces,
} from "./geonames.mjs";

function response(geonames) {
  return new Response(JSON.stringify({ geonames }), {
    status:200,
    headers:{ "content-type":"application/json" },
  });
}

test("GeoNames place search returns only canonical Fibre geography", async () => {
  let requested = null;
  const places = await searchGeoNamesPlaces({
    query:"Tokyo, Japan",
    username:"fibre-test",
    fetchImpl:async (url) => {
      requested = new URL(url);
      return response([
        {
          fcl:"P",
          name:"Tokyo",
          countryName:"Japan",
          countryCode:"JP",
          adminName1:"Tokyo",
          lat:"35.6895",
          lng:"139.69171",
        },
        {
          fcl:"A",
          name:"Tokyo",
          countryName:"Japan",
          lat:"35.68",
          lng:"139.76",
        },
      ]);
    },
  });

  assert.equal(requested.hostname, "secure.geonames.org");
  assert.equal(requested.searchParams.get("featureClass"), "P");
  assert.equal(requested.searchParams.get("username"), "fibre-test");
  assert.deepEqual(places, [{
    country:"Japan",
    countryCode:"JP",
    city:"Tokyo",
    displayName:"Tokyo, Japan",
    lat:35.6895,
    long:139.69171,
  }]);
});

test("GeoNames explicit resolution respects country and locality qualifier", async () => {
  const place = await resolveGeoNamesPlace({
    country:"United States",
    city:"Santa Fe, New Mexico",
    username:"fibre-test",
    fetchImpl:async () => response([
      {
        fcl:"P",
        name:"Santa Fe",
        countryName:"Argentina",
        countryCode:"AR",
        adminName1:"Santa Fe",
        lat:"-31.6333",
        lng:"-60.7",
      },
      {
        fcl:"P",
        name:"Santa Fe",
        countryName:"United States",
        countryCode:"US",
        adminName1:"New Mexico",
        lat:"35.68698",
        lng:"-105.9378",
      },
    ]),
  });

  assert.equal(place.displayName, "Santa Fe, New Mexico, United States");
  assert.equal(place.countryCode, "US");
  assert.equal(place.lat, 35.68698);
});

test("GeoNames reverse lookup produces the same canonical geography shape", async () => {
  const place = await reverseGeoNamesPlace({
    lat:35.6895,
    long:139.69171,
    username:"fibre-test",
    fetchImpl:async (url) => {
      const requested = new URL(url);
      assert.equal(requested.pathname, "/findNearbyPlaceNameJSON");
      assert.equal(requested.searchParams.get("lng"), "139.69171");
      return response([{
        fcl:"P",
        name:"Tokyo",
        countryName:"Japan",
        countryCode:"JP",
        adminName1:"Tokyo",
        lat:"35.6895",
        lng:"139.69171",
      }]);
    },
  });

  assert.deepEqual(place, {
    country:"Japan",
    countryCode:"JP",
    city:"Tokyo",
    displayName:"Tokyo, Japan",
    lat:35.6895,
    long:139.69171,
  });
});

test("Thread destination geography requires exact city and verified timezone",async()=>{
  const lookup=async(url)=>{
    const u=new URL(url);
    if(u.pathname==="/timezoneJSON"){
      assert.equal(u.searchParams.get("lat"),"41.1496");
      return new Response(JSON.stringify({timezoneId:"Europe/Lisbon"}));
    }
    return response([
      {fcl:"P",name:"Porto",countryName:"Portugal",countryCode:"PT",
        lat:"41.1496",lng:"-8.6109"},
      {fcl:"P",name:"Porto",countryName:"Brazil",countryCode:"BR",
        lat:"-10",lng:"-50"},
    ]);
  };
  const grounded=await resolveGeoNamesLocality({
    city:"Porto",country:"Portugal",username:"fibre-test",fetchImpl:lookup,
  });
  assert.equal(grounded?.locality,"Porto");
  assert.equal(grounded?.countryCode,"PT");
  assert.equal(grounded?.timeZone,"Europe/Lisbon");
  assert.equal(await resolveGeoNamesLocality({
    city:"Nonexistent",country:"Portugal",username:"fibre-test",fetchImpl:lookup,
  }),null,"unmatched geographical name must not silently use a nearby city");
});
