# AI SaaS Platform - Next.js Template

A comprehensive AI-powered SaaS platform built with Next.js 14+, TypeScript, and Tailwind CSS. This template provides a complete foundation for building AI-integrated applications with user authentication, subscription billing, and real-time chat interfaces.

## 🚀 Features

- **Next.js 14+** with App Router and TypeScript
- **AI Integration** with OpenAI and Anthropic APIs
- **Authentication** with NextAuth.js (Google, GitHub OAuth)
- **Subscription Billing** with Stripe integration
- **Real-time Chat** with AI streaming responses
- **Modern UI** with Tailwind CSS and Radix UI components
- **Dark Mode** support with next-themes
- **Responsive Design** optimized for all devices
- **Type Safety** with strict TypeScript configuration
- **Testing** setup with Jest and React Testing Library
- **Code Quality** with ESLint, Prettier, and Husky

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn package manager
- PostgreSQL database (for production)
- Stripe account (for payments)
- OpenAI API key
- Anthropic API key (optional)

## 🛠️ Getting Started

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd ai-saas-nextjs-template
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `STRIPE_PUBLISHABLE_KEY` & `STRIPE_SECRET_KEY`: Your Stripe keys
   - Database connection string
   - OAuth provider credentials

3. **Database Setup**
   ```bash
   # Run database migrations (when implemented)
   npm run db:migrate
   ```

4. **Development Server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   └── chat/             # Chat interface components
├── lib/                  # Utility libraries
│   ├── auth.ts           # NextAuth configuration
│   ├── stripe.ts         # Stripe configuration
│   ├── ai/               # AI provider integrations
│   └── utils.ts          # General utilities
├── types/                # TypeScript type definitions
├── hooks/                # Custom React hooks
├── config/               # Application configuration
└── styles/               # Global styles
```

## 🔧 Configuration

### Authentication
The template uses NextAuth.js with support for:
- Email/password authentication
- Google OAuth
- GitHub OAuth
- Custom user roles and permissions

### AI Integration
- **OpenAI GPT models** for text generation
- **Anthropic Claude** for alternative AI responses
- **Streaming responses** for real-time chat
- **Usage tracking** and cost monitoring

### Payments
- **Stripe integration** for subscription billing
- **Multiple pricing tiers**
- **Usage-based billing** options
- **Webhook handling** for payment events

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on git push

### Other Platforms
The template works with any Node.js hosting platform:
- Railway
- Heroku
- DigitalOcean App Platform
- AWS Amplify

## 🔒 Security Features

- **Security headers** configured in next.config.js
- **Input validation** with Zod schemas
- **Rate limiting** for API endpoints
- **CSRF protection** with NextAuth.js
- **Environment variable validation**

## 📊 Monitoring and Analytics

- **Error tracking** with optional Sentry integration
- **Analytics** with optional Google Analytics
- **User behavior tracking** with optional PostHog
- **Performance monitoring** built-in

## 🎨 Customization

### Styling
- Modify `tailwind.config.js` for design tokens
- Update CSS variables in `globals.css`
- Customize component styles in `/components/ui`

### AI Models
- Add new AI providers in `/lib/ai/providers`
- Configure model parameters in `/config/ai.ts`
- Implement custom prompt templates

### Features
- Add new routes in `/app` directory
- Create reusable components in `/components`
- Extend API functionality in `/app/api`

## 📚 Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Create an issue for bug reports
- Join our Discord community for discussions
- Check the documentation for common questions

---

Built with ❤️ using the DNA Template System