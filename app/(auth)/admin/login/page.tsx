import { LoginForm } from "@/components/shared/login-form";

const Page = () => {
  return (
    <div>
      <LoginForm
        cardTitle="Admin login"
        cardDescription="Enter your credentials to access the admin dashboard and oversee platform operations."
      />
    </div>
  );
};

export default Page;
