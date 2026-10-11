import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { prisma } from "../data/prisma.js";
import {
  authenticate,
  createAccessToken,
  hashToken,
  newRefreshToken,
} from "../middleware/auth.js";
import { generateId } from "../utils/hash.js";
import { today } from "../utils/time.js";
import { addNotification } from "../utils/notify.js";
import {
  isNonEmptyString,
  isOneOf,
  optionalString,
} from "../utils/validate.js";

const router = Router();
const phoneVariants = (value: string) => {
  const phone = value.replace(/[\s\-()]/g, "").trim();
  const nigerian = /^\+234(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return nigerian ? [phone, `+234 ${nigerian[1]} ${nigerian[2]} ${nigerian[3]}`] : [phone];
};
const safeUser = (u: any) => ({
  id: u.id,
  name: u.name || u.data?.name || "",
  role: u.role,
  phone: u.phone,
  email: u.data?.email ?? "",
  location: u.data?.location ?? "",
  farmOrBusinessName: u.data?.farmOrBusinessName ?? "",
  farmSize: u.data?.farmSize ?? "",
  cropsOrInterests: u.data?.cropsOrInterests ?? "",
  verified: u.verified,
  registeredDate: u.data?.registeredDate ?? "",
});
const issueSession = async (user: any, req: any, res: any) => {
  const accessToken = createAccessToken({
    id: user.id,
    phone: user.phone,
    role: user.role,
    authVersion: user.authVersion,
  });
  const refreshToken = newRefreshToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.authSession.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt,
      userAgent: optionalString(req.get("user-agent")),
    },
  });
  res.json({
    success: true,
    data: { accessToken, refreshToken, user: safeUser(user) },
  });
};

router.post("/register", async (req, res, next) => {
  try {
    const b = req.body ?? {};
    if (
      !isNonEmptyString(b.name) ||
      !isNonEmptyString(b.phone) ||
      !isNonEmptyString(b.password) ||
      !isNonEmptyString(b.role)
    ) {
      res.status(400).json({
        success: false,
        error: "name, phone, role and password are required",
      });
      return;
    }
    if (!isOneOf(b.role, ["farmer", "buyer"])) {
      res
        .status(400)
        .json({ success: false, error: "role must be farmer or buyer" });
      return;
    }
    if (b.password.length < 10) {
      res.status(400).json({
        success: false,
        error: "password must be at least 10 characters",
      });
      return;
    }
    const phone = b.phone.replace(/[\s\-()]/g, "").trim();

    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      res.status(400).json({
        success: false,
        error:
          "Phone number must use international format, e.g., +2348012345678",
      });
      return;
    }

    const existing = await prisma.user.findFirst({ where: { phone: { in: phoneVariants(phone) } } });
    if (existing) {
      res.status(409).json({ success: false, error: "A user with this phone number already exists" });
      return;
    }

    const user = {
      id: generateId("usr"),
      name: b.name.trim(),
      role: b.role,
      phone,
      email: optionalString(b.email) ?? "",
      location: optionalString(b.location) ?? "Regional Farm Hub",
      farmOrBusinessName: optionalString(b.farmOrBusinessName) ?? "",
      farmSize: optionalString(b.farmSize) ?? "",
      cropsOrInterests: optionalString(b.cropsOrInterests) ?? "",
      verified: false,
      registeredDate: today(),
    };
    const created = await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        phone,
        role: user.role,
        verified: false,
        passwordHash: await bcrypt.hash(b.password, 12),
        data: user as any,
      },
    });
    await addNotification("Admin", `New ${user.role === "farmer" ? "Farmer" : "Buyer"} Registered`, `${user.name} registered from ${user.location}. Pending verification review.`);
    await issueSession(created, req, res);
  } catch (e: any) {
    if (e.code === "P2002") {
      res.status(409).json({
        success: false,
        error: "A user with this phone number already exists",
      });
      return;
    }
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { phone, password } = req.body ?? {};
    if (!isNonEmptyString(phone) || !isNonEmptyString(password)) {
      res
        .status(400)
        .json({ success: false, error: "phone and password are required" });
      return;
    }
    const user = await prisma.user.findFirst({
      where: { phone: { in: phoneVariants(phone) } },
    });
    if (
      !user?.passwordHash ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      res
        .status(401)
        .json({ success: false, error: "Invalid phone number or password" });
      return;
    }
    await issueSession(user, req, res);
  } catch (e) {
    next(e);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const token = req.body?.refreshToken;
    if (!isNonEmptyString(token)) {
      res
        .status(400)
        .json({ success: false, error: "refreshToken is required" });
      return;
    }
    const old = await prisma.authSession.findUnique({
      where: { refreshTokenHash: hashToken(token) },
    });
    if (!old || old.revokedAt || old.expiresAt <= new Date()) {
      res
        .status(401)
        .json({ success: false, error: "Invalid or expired refresh token" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: old.userId } });
    if (!user) {
      res
        .status(401)
        .json({ success: false, error: "Session user no longer exists" });
      return;
    }
    const nextToken = newRefreshToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.$transaction(async (tx) => {
      const revoked = await tx.authSession.updateMany({
        where: { id: old.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (revoked.count !== 1)
        throw Object.assign(new Error("Refresh token has already been used"), {
          status: 401,
        });
      await tx.authSession.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          refreshTokenHash: hashToken(nextToken),
          expiresAt,
          userAgent: optionalString(req.get("user-agent")),
        },
      });
    });
    res.json({
      success: true,
      data: {
        accessToken: createAccessToken({
          id: user.id,
          phone: user.phone,
          role: user.role,
          authVersion: user.authVersion,
        }),
        refreshToken: nextToken,
        user: safeUser(user),
      },
    });
  } catch (e) {
    next(e);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const token = req.body?.refreshToken;
    if (isNonEmptyString(token))
      await prisma.authSession.updateMany({
        where: { refreshTokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    res.json({ success: true, data: { loggedOut: true } });
  } catch (e) {
    next(e);
  }
});
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.authUser!.id },
    });
    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }
    res.json({ success: true, data: safeUser(user) });
  } catch (e) {
    next(e);
  }
});
export default router;
