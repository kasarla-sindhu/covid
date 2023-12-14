const express = require("express");
const app = express();

const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken");
app.use(express.json());
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("SERVER RUNNING AT http://localhost:3000");
    });
  } catch (e) {
    console.log(`Server Error is ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const authentication = async (request, response, next) => {
  let token;
  const header = request.headers["authorization"];
  if (header !== undefined) {
    token = header.split(" ")[1];
  }
  if (token === undefined) {
    response.status = 401;
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(token, "q2w3e4r5t6y7", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `
    select *
    from user
    where username='${username}'`;
  const userCheck = await db.get(getUserQuery);
  if (userCheck === undefined) {
    response.status = 400;
    response.send("Invalid user");
  } else {
    const passswordCheck = await bcrypt.compare(password, userCheck.password);
    if (passswordCheck) {
      const payload = { username: username };
      const jwtTokenRes = await jwt.sign(payload, "q2w3e4r5t6y7");
      response.send({ jwtToken: jwtTokenRes });
      console.log(jwtTokenRes);
    } else {
      response.status = 400;
      response.send("Invalid Password");
    }
  }
});

app.get("/states/", authentication, async (request, response) => {
  const getStatesQuery = `
    select state_id as stateId,
    state_name as stateName,
    population
    from state`;
  const getStatesRes = await db.all(getStatesQuery);
  response.send(getStatesRes);
});

app.get("/states/:stateId/", authentication, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    select state_id as stateId,
    state_name as stateName,population
    from state
    where state_id=${stateId}`;
  const getStateRes = await db.get(getStateQuery);
  response.send(getStateRes);
});

app.post("/districts/", authentication, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postQuery = `
    insert into district(district_name,state_id,cases,
        cured,active,deaths)
        values('${districtName}',${stateId},${cases},${cured},${active},${deaths})`;
  const postRes = await db.run(postQuery);
  response.send("District Successfully Added");
});

app.get(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const getDisQuery = `
    select district_id as districtId,
    district_name as districtName,
    state_id as stateId,
    cases,cured,active,deaths
    where district_id=${districtId}`;
    const getDisRes = await db.get(getDisQuery);
    response.send(getDisRes);
  }
);

app.delete(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteQuery = `
    delete from district
    where district_id=${districtId}`;
    await db.run(deleteQuery);
    response.send("District Removed");
  }
);

app.put(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const details = request.body;
    const { districtName, stateId, cases, cured, active, deaths } = details;
    const putQuery = `
  update district
  set 
  district_name='${districtName}',
  state_id=${stateId},
  cases=${cases},
  cured=${cured},
  active=${active},
  deaths=${deaths}
  where district_id=${districtId}`;
    const putRes = await db.run(putQuery);
    response.send("District Details Updated");
  }
);

app.get(
  "/states/:stateId/stats/",
  authentication,
  async (request, response) => {
    const { stateId } = request.params;
    const getQuery = `
    select sum(cases) as totalCases,
    sum(cured) as totalCured,
    sum(active) as totalActive,
    sum(deaths) as totalDeaths
    from district
    where state_id=${stateId}`;
    const queryRes = await db.get(getQuery);
    response.send(queryRes);
  }
);
module.exports = app;
