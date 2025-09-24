import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="login-card w-[360px] sm:w-[420px] px-8 py-8 border border-black/20 rounded-[28px] relative">
        {/* logo + title */}
        <div className="flex flex-col items-center gap-2">
          <Image src="/logo-hat.svg" alt="Logo" width={36} height={36} />
          <h1 className="text-3xl font-extrabold tracking-tight">Login</h1>
        </div>

        {/* inputs */}
        <div className="mt-6 space-y-3">
          <div className="input-soft rounded-xl h-11 flex items-center px-4 text-[15px] text-black/70">
            Username
          </div>
          <div className="input-soft rounded-xl h-11 flex items-center px-4 text-[15px] text-black/70">
            Password
          </div>
          <div className="text-right text-sm text-muted cursor-pointer select-none">Forgot password</div>
        </div>

        {/* primary button */}
        <button className="btn-primary mt-4 w-full h-11 rounded-full text-white font-semibold">
          Login
        </button>

        {/* divider */}
        <div className="mt-4 text-center text-sm text-black/70">Or</div>

        {/* Google button */}
        <button className="mt-3 w-full h-11 rounded-full bg-black/5 flex items-center justify-center gap-3 text-black/60">
          <Image src="/google.svg" alt="Google" width={20} height={20} />
          <span>Sign in with google</span>
        </button>
      </div>
    </div>
  );
}
