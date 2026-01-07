import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useCreateAccount } from "@/hooks/use-accounts";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
});

export function AddAccountDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();
  const createAccount = useCreateAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const validated = formSchema.parse({ name });
      await createAccount.mutateAsync(validated);
      toast({
        title: "Account Created",
        description: "Your new trading account has been added successfully.",
      });
      setOpen(false);
      setName("");
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError(err.message || "Failed to create account");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full font-medium shadow-lg hover:bg-white/90 hover:scale-105 active:scale-95 transition-all duration-200">
          <Plus className="w-4 h-4" />
          <span>Add Account</span>
        </button>
      </DialogTrigger>
      <DialogContent className="glass-panel border-white/10 bg-zinc-950/90 text-white sm:max-w-[425px] p-0 overflow-hidden">
        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold tracking-tight">Add New Account</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Create a new trading account to track your portfolio.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-zinc-300">
                Account Name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                placeholder="e.g. FTMO Challenge #1"
                autoFocus
              />
              {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createAccount.isPending}
                className="px-6 py-2 rounded-lg bg-white text-black font-semibold text-sm shadow-lg shadow-white/10 hover:shadow-xl hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {createAccount.isPending ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
