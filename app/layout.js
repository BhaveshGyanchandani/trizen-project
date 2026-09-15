import "./fonts";
import "./globals.css";
import { AuthProvider } from "@/lib/useAuth";
import { ToastProvider } from "@/lib/useToast";

export const metadata = {
  title: "Trizen Photo Ops",
  description: "Collect, review, and share event photo galleries.",
};

/**
 * Root layout wrapping every page in the app. Loads global fonts/styles
 * and provides the two app-wide contexts — authentication
 * (`AuthProvider`) and toast notifications (`ToastProvider`) — so any
 * page or component can call `useAuth()` / `useToast()`.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
