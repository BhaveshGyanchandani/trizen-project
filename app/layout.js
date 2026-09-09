import "./fonts";
import "./globals.css";
import { AuthProvider } from "@/lib/useAuth";
import { ToastProvider } from "@/lib/useToast";

export const metadata = {
  title: "Trizen Photo Ops",
  description: "Collect, review, and share event photo galleries.",
};

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
