// Historic stillborn outcomes and the operator's birthplace catalog remain
// inspectable. All new birth operations belong exclusively to /births.
export function createBirthCatalogApi({stillbornBirths,birthplaces,privateToken}={}){
  return Object.freeze({
    async fetch(request){
      const path=new URL(request.url).pathname;
      if(!["/internal/births/stillborn","/internal/births/places"].includes(path))
        return null;
      if(request.headers.get("x-fibre-private-token")!==privateToken)
        return Response.json({error:"private_token_required"},{status:403});
      if(request.method!=="GET")
        return Response.json({error:"method_not_allowed"},{status:405});
      return Response.json(path.endsWith("/places")
        ?{ok:true,places:birthplaces}:{ok:true,births:stillbornBirths()},
        {headers:{"Cache-Control":"no-store"}});
    },
  });
}
