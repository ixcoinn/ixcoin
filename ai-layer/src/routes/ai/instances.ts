import { Router, type IRouter } from "express";
import {
  getAllInstances,
  createInstance,
  getInstanceById,
  archiveInstance,
} from "../../ai-layer/ai_core.js";
import { requestTransition } from "../../lifecycle/lifecycle_manager.js";
import { loadMemory, saveMemory } from "../../ai-layer/ai_memory.js";

const router: IRouter = Router();

router.get("/ai/instances", async (_req, res): Promise<void> => {
  const instances = await getAllInstances();
  res.json(instances);
});

router.post("/ai/instances", async (req, res): Promise<void> => {
  const { name, walletAddress } = req.body as {
    name?: string;
    walletAddress?: string | null;
  };

  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const instance = await createInstance(name, walletAddress);
  res.status(201).json(instance);
});

router.get("/ai/instances/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const instance = await getInstanceById(raw);

  if (!instance) {
    res.status(404).json({ error: "AI instance not found" });
    return;
  }

  res.json(instance);
});

router.delete("/ai/instances/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const instance = await getInstanceById(raw);

  if (!instance) {
    res.status(404).json({ error: "AI instance not found" });
    return;
  }

  await archiveInstance(raw);
  res.sendStatus(204);
});

router.get("/ai/instances/:id/memory", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const instance = await getInstanceById(raw);

  if (!instance) {
    res.status(404).json({ error: "AI instance not found" });
    return;
  }

  const memory = await loadMemory(raw);
  if (!memory) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }

  res.json(memory);
});

router.patch("/ai/instances/:id/memory", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const instance = await getInstanceById(raw);

  if (!instance) {
    res.status(404).json({ error: "AI instance not found" });
    return;
  }

  const { memories } = req.body as { memories?: Record<string, unknown> };
  if (!memories || typeof memories !== "object") {
    res.status(400).json({ error: "memories must be an object" });
    return;
  }

  const updated = await saveMemory(raw, memories);
  res.json(updated);
});

router.post("/ai/instances/:id/activate", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;

  try {
    const instance = await requestTransition(raw, "ACTIVATE", "manual_api");
    res.json(instance);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
});

router.post("/ai/instances/:id/dormant", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;

  try {
    const instance = await requestTransition(raw, "DORMANT", "manual_api");
    res.json(instance);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
});

export default router;
