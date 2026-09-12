import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    fullName: "Test User",
    email: `auth-e2e-${Date.now()}@example.com`,
    password: "Password123",
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix("api/v1");
    app.use(cookieParser());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });


  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: testUser.email,
      },
    });

    await app.close();
  });



  it("1. registers a new account", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(testUser)
      .expect(201);


    expect(res.body.user.email)
      .toBe(testUser.email);


    expect(res.body.accessToken)
      .toEqual(expect.any(String));


    expect(res.body.user.passwordHash)
      .toBeUndefined();


    const setCookie = res.headers["set-cookie"];

    const cookies = Array.isArray(setCookie)
      ? setCookie
      : [setCookie];


    expect(
      cookies.some((cookie) =>
        cookie.startsWith("refreshToken="),
      ),
    ).toBe(true);
  });



  it("2. logs in successfully with correct credentials", async () => {

    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200);


    expect(res.body.accessToken)
      .toEqual(expect.any(String));

  });



  it("3. rejects login with wrong password", async () => {

    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,
        password: "WrongPassword123",
      })
      .expect(401);


    expect(res.body.message)
      .toBeDefined();

  });



  it("4. rejects registration with duplicate email", async () => {

    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(testUser)
      .expect(409);


    expect(res.body.message)
      .toBeDefined();

  });



  it("5. logs out and revokes refresh token", async () => {

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200);


    const cookies = loginRes.headers["set-cookie"];

    const accessToken =
      loginRes.body.accessToken;



    await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", cookies)
      .set(
        "Authorization",
        `Bearer ${accessToken}`,
      )
      .expect(200);



    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookies)
      .expect(401);

  });



  it("6. refreshes access token using valid refresh token", async () => {

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200);



    const cookies =
      loginRes.headers["set-cookie"];



    const refreshRes = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookies)
      .expect(200);



    expect(refreshRes.body.accessToken)
      .toEqual(expect.any(String));



    expect(
      refreshRes.headers["set-cookie"],
    ).toBeDefined();

  });



  it("7. rejects protected endpoint without authentication", async () => {

    const res = await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .expect(401);


    expect(res.body.message)
      .toBeDefined();

  });



  it("8. allows access protected endpoint with valid access token", async () => {

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200);



    const accessToken =
      loginRes.body.accessToken;



    const res = await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .set(
        "Authorization",
        `Bearer ${accessToken}`,
      )
      .expect(200);



    expect(res.body.email)
      .toBe(testUser.email);

  });

});