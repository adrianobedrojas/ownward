export function getOrCreateVisitorToken(): string {
  if (typeof window === 'undefined') return '';
  
  let token = localStorage.getItem('onward_visitor_token');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('onward_visitor_token', token);
  }
  return token;
}
