export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
        <p className="mb-8 text-xl font-semibold tracking-tight">
          Trizen <span className="text-primary">Photo Ops</span>
        </p>
        {children}
      </div>
    </div>
  );
}
