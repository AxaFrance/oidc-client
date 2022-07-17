export const getLocation = (href: string) => {
  const match = href.match(
    // eslint-disable-next-line no-useless-escape
    /^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/
  );
  
  let search = match[6];
  let hash = match[7];

    if (hash) {
        const splits = hash.split("?");
        if(splits.length ==2){
            hash = splits[0];
            search = splits[1];
        }
    }
    
    if(search){
        search = search.slice(1);
    }
  
  return (
    match && {
      href,
      protocol: match[1],
      host: match[2],
      hostname: match[3],
      port: match[4],
      path: match[5],
      search,
      hash,
    }
  );
};

export const getPath = (href: string) => {
  const location = getLocation(href);
  let { path } = location;
  
  if(path.endsWith('/')){
      path = path.slice(0, -1);
  }
  let { hash } = location;
  
  if(hash === "#_=_"){
      hash = "";
  }

  if (hash) {
    path += hash;
  }

  return path;
};

export const getParseQueryStringFromLocation=(href: string) => {
    const location = getLocation(href);
    let { search } = location;
    
    return parseQueryString(search);
}

const parseQueryString = (queryString:string) => {
    let params:any = {}, queries, temp, i, l;

    // Split into key/value pairs
    queries = queryString.split("&");

    // Convert the array of strings into an object
    for (i = 0, l = queries.length; i < l; i++) {
        temp = queries[i].split('=');
        params[temp[0]] = temp[1];
    }

    return params;
};
