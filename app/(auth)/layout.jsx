export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-paper text-plate">
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
        <p className="mb-8 font-display text-2xl">
          Trizen <span className="text-safelight">Photo Ops</span>
        </p>
        {children}
      </div>
    </div>
  );
}
