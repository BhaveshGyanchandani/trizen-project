import assert from "node:assert/strict";
import test from "node:test";
import {
  // Icons already used by the application. They must survive the upgrade.
  Camera,
  Check,
  CheckCircle2,
  Copy,
  ImageOff,
  Images,
  Key,
  Loader2,
  Lock,
  LogOut,
  PanelLeft,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  UploadCloud,
  Users,
  X,
  // Icons that first became available in lucide-react 1.74.0.
  BotCheck,
  BotMinus,
  BotPlus,
  BotX,
  Cinema,
  CircleBounce,
  CirclePersonArmsSpread,
  Doghouse,
  HandTruck,
  HouseArrowLeft,
  HouseArrowRight,
  NigerianNaira,
  StrokeWidth,
  WarehouseWaves,
} from "lucide-react";

const appIcons = {
  Camera,
  Check,
  CheckCircle2,
  Copy,
  ImageOff,
  Images,
  Key,
  Loader2,
  Lock,
  LogOut,
  PanelLeft,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  UploadCloud,
  Users,
  X,
};

const iconsAddedIn174 = {
  BotCheck,
  BotMinus,
  BotPlus,
  BotX,
  Cinema,
  CircleBounce,
  CirclePersonArmsSpread,
  Doghouse,
  HandTruck,
  HouseArrowLeft,
  HouseArrowRight,
  NigerianNaira,
  StrokeWidth,
  WarehouseWaves,
};

test("lucide-react still exports every icon the app imports", () => {
  for (const [name, icon] of Object.entries(appIcons)) {
    assert.ok(icon, `${name} should remain exported by lucide-react`);
    assert.ok(
      typeof icon === "function" || typeof icon === "object",
      `${name} should be a renderable icon component`,
    );
  }
});

test("lucide-react 1.74.0 exposes the renamed and newly added icons", () => {
  for (const [name, icon] of Object.entries(iconsAddedIn174)) {
    assert.ok(icon, `${name} should be exported by lucide-react 1.74.0`);
    assert.ok(
      typeof icon === "function" || typeof icon === "object",
      `${name} should be a renderable icon component`,
    );
  }
});
