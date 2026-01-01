import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-8">Sign In</h1>
      
      <div className="flex gap-8">
        <LoginForm 
          accountType="buyer" 
          registerLink="/buyer/register"
        />
        
        <LoginForm 
          accountType="dealer" 
          registerLink="/dealer/register"
        />
      </div>
    </div>
  )
}