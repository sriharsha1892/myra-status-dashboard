# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e7]:
    - generic [ref=e8]:
      - img [ref=e11]
      - heading "myRA AI" [level=1] [ref=e13]
      - paragraph [ref=e14]: Support Portal
    - generic [ref=e16]:
      - generic [ref=e17]:
        - heading "Welcome back" [level=2] [ref=e18]
        - paragraph [ref=e19]: Sign in to access your support dashboard
      - generic [ref=e20]:
        - generic [ref=e21]:
          - generic [ref=e22]: Email address
          - textbox "Email address" [ref=e24]:
            - /placeholder: you@company.com
        - generic [ref=e25]:
          - generic [ref=e26]:
            - generic [ref=e27]: Password
            - button "Forgot password?" [ref=e28] [cursor=pointer]
          - textbox "Password" [ref=e30]:
            - /placeholder: Enter your password
        - button "Sign in" [ref=e31] [cursor=pointer]:
          - generic [ref=e33]: Sign in
      - paragraph [ref=e35]:
        - img [ref=e36]
        - generic [ref=e38]: Protected by enterprise-grade security
    - paragraph [ref=e40]:
      - text: Need assistance?
      - link "Contact support" [ref=e41] [cursor=pointer]:
        - /url: "#"
        - text: Contact support
        - img [ref=e42]
  - button "Open Next.js Dev Tools" [ref=e49] [cursor=pointer]:
    - img [ref=e50]
  - alert [ref=e53]: myRA AI
```