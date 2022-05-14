const http = require("http");
const app = require("express")();
const url = require("url");
const async = require("async");

const extractQueryList = (query) => {
  let queryList = [];

  if (query) {
    if (typeof query === "string") {
      queryList.push(query);
    } else {
      queryList = query;
    }
  }

  return queryList;
};

const getTitle = async (query) => {
  try {
    let html = await new Promise((resolve, reject) => {
      const urlParsed = url.parse(query);
      let { host, href: address } = urlParsed;

      const protocol = "https";
      const port = 443;
      if (!host) {
        host = address;
      }

      if (!host.startsWith("www.")) {
        host = "www." + host;
      }

      let request = require(protocol).request(
        `${protocol}://${host}`,
        { port, method: "GET" },
        (response) => {
          // COLLECT WEB CONTENT
          let chunks = [];
          response.setEncoding("utf8");
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("error", (err) => reject(err));
          response.on("end", () => resolve(chunks.join("")));
        }
      );
      request.on("error", (err) => reject(err));
      request.end();
    });

    // PARSE TITLE TAG OUT OF THE WEB CONTENT
    let [, , title = null] =
      html.match(/<title( [^>]*)?>(.*)<[/]title>/i) || [];
    if (!title)
      throw new Error({
        query,
        title: `NO RESPONSE`,
      });

    return {
      query,
      title,
    };
  } catch (err) {
    return {
      query,
      title: `NO RESPONSE`,
    };
  }
};

app.get("/", async (req, res, next) => {
  res.render("home");
});
app.get("/2/I/want/title/", async (req, res, next) => {
  const { originalUrl } = req;
  const { address: query } = req.query;
  let queryList = extractQueryList(query);

  if (queryList.length > 0) {
    async
      .parallel(
        queryList.map((q) => {
          return async () => await Promise.resolve(getTitle(q));
        })
      )
      .then((data) => {
        res.render("index", { query, originalUrl, method: 2, address: data });
      });
  } else {
    res.status(400);
    res.render("index", {
      query: "Empty",
      method: 2,
      originalUrl,
      address: [
        {
          query: "404",
          title: "Bad Request",
        },
      ],
    });
  }
});

app.get("/3/I/want/title/", async (req, res, next) => {
  const { originalUrl } = req;
  const { address: query } = req.query;
  let queryList = extractQueryList(query);

  if (queryList.length > 0) {
    Promise.allSettled(queryList.map((q) => getTitle(q))).then((values) => {
      const data = values.map((v) => v.value);
      res.render("index", {
        query,
        originalUrl,
        method: 3,
        address: [...data],
      });
    });
  } else {
    res.status(400);
    res.render("index", {
      query: "Empty",
      originalUrl,
      method: 3,
      address: [
        {
          query: "404",
          title: "Bad Request",
        },
      ],
    });
  }
});

module.exports = app;
