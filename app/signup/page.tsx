export default function SignupPage() {
  return (
    <main>
      <h1>Create LifeVault Account</h1>

      <form>
        <div>
          <label>Email</label>
          <input type="email" />
        </div>

        <div>
          <label>Password</label>
          <input type="password" />
        </div>

        <button type="submit">
          Create Account
        </button>
      </form>
    </main>
  );
}
