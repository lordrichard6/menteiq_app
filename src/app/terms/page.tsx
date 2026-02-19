import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <div className="container mx-auto px-6 py-12 max-w-4xl">
                <Link href="/" className="inline-flex items-center text-[#3D4A67] hover:text-[#E9B949] font-medium mb-8 transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                </Link>

                <h1 className="text-4xl font-bold text-[#3D4A67] mb-2">Terms of Service</h1>
                <p className="text-slate-500 mb-12">Last updated: January 16, 2026</p>

                <div className="prose prose-slate max-w-none">
                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-[#3D4A67] mb-4">1. Acceptance of Terms</h2>
                        <p className="text-slate-600 mb-4">
                            By accessing and using MenteIQ ("the Service"), a product of Lopes2tech, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-[#3D4A67] mb-4">2. Account Registration</h2>
                        <p className="text-slate-600 mb-4">
                            To access certain features of the Service, you may be required to register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for all activities that occur under your account.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-[#3D4A67] mb-4">3. Subscription and Billing</h2>
                        <p className="text-slate-600 mb-4">
                            Detailed pricing and subscription terms are available on our pricing page. You agree to pay all fees or charges to your account in accordance with the fees, charges, and billing terms in effect at the time a fee or charge is due and payable. Subscription fees are non-refundable except as required by law.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-[#3D4A67] mb-4">4. Intellectual Property</h2>
                        <p className="text-slate-600 mb-4">
                            The Service and its original content, features, and functionality are and will remain the exclusive property of Lopes2tech and its licensors. MenteIQ is a product of Lopes2tech. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of MenteIQ.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-[#3D4A67] mb-4">5. Limitation of Liability</h2>
                        <p className="text-slate-600 mb-4">
                            In no event shall MenteIQ, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage, and even if a remedy set forth herein is found to have failed of its essential purpose.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-[#3D4A67] mb-4">6. Contact Us</h2>
                        <p className="text-slate-600 mb-4">
                            If you have any questions about these Terms, please contact us at paulo@menteiq.ch.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    )
}
