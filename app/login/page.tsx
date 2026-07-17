export default function LoginPage() {
  return (
    <main>
      <h1>Login to LifeVault</h1>

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
          Login
        </button>
      </form>
    </main>
  );
}
