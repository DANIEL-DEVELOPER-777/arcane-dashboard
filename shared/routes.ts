import { z } from "zod";
import { insertAccountSchema, accounts, equitySnapshots } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: "POST" as const,
      path: "/api/login",
      input: z.object({
        username: z.string(),
        password: z.string(),
        rememberMe: z.boolean().optional(),
      }),
      responses: {
        200: z.object({ message: z.string() }),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/logout",
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    check: {
      method: "GET" as const,
      path: "/api/user",
      responses: {
        200: z.object({ username: z.string() }).nullable(),
      },
    }
  },
  accounts: {
    list: {
      method: "GET" as const,
      path: "/api/accounts",
      responses: {
        200: z.array(z.custom<typeof accounts.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/accounts",
      input: insertAccountSchema,
      responses: {
        201: z.custom<typeof accounts.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/accounts/:id",
      responses: {
        200: z.custom<typeof accounts.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/accounts/:id",
      input: insertAccountSchema.partial(),
      responses: {
        200: z.custom<typeof accounts.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/accounts/:id",
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    history: {
      method: "GET" as const,
      path: "/api/accounts/:id/history",
      input: z.object({
        period: z.enum(["1D", "1W", "1M", "1Y", "ALL"]).optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof equitySnapshots.$inferSelect>()),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  portfolio: {
    summary: {
      method: "GET" as const,
      path: "/api/portfolio/summary",
      input: z.object({ period: z.enum(["1D", "1W", "1M", "1Y", "ALL"]).optional() }).optional(),
      responses: {
        200: z.object({
          totalBalance: z.number(),
          totalEquity: z.number(),
          totalProfit: z.number(),
          totalProfitPercent: z.number(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    history: {
      method: "GET" as const,
      path: "/api/portfolio/history",
      input: z.object({
        period: z.enum(["1D", "1W", "1M", "1Y", "ALL"]).optional(),
      }).optional(),
      responses: {
        200: z.array(z.object({
          timestamp: z.string(), // ISO string
          equity: z.number(),
          balance: z.number(),
        })),
        401: errorSchemas.unauthorized,
      },
    },
  },
  webhook: {
    mt5: {
      method: "POST" as const,
      path: "/api/webhook/mt5/:token",
      input: z.object({
        balance: z.number(),
        equity: z.number(),
        profit: z.number(),
        dailyProfit: z.number().optional(),
      }),
      responses: {
        200: z.object({ status: z.string() }),
        404: errorSchemas.notFound,
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
