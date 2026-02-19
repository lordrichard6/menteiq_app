import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <div className="container mx-auto px-6 py-12 max-w-4xl">
                <Link href="/" className="inline-flex items-center text-[#3D4A67] hover:text-[#E9B949] font-medium mb-8 transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                </Link>

                <h1 className="text-4xl font-bold text-[#3D4A67] mb-2">Privacy Policy</h1>
                <p className="text-slate-500 mb-12">Last updated: January 16, 2026</p>

                <div className="prose prose-slate max-w-none">
                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-[#3D4A67] mb-4">1. Information Collection</h2>
                        <p className="text-slate-600 mb-4">
                            We collect information you provide directly to us, such as when you create an account, update your profile, use the interactive features of our Service, or communicate with us. This information may include your name, email address, phone number, and any other information you choose to provide.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-[#3D4A67] mb-4">2. Use of Data</h2>
                        <p className="text-slate-600 mb-4">
                            MenteIQ uses the collected data for various purposes:
                        </p>
                        <ul className="list-disc pl-5 text-slate-600 space-y-2">
                            <li>To provide and maintain the Service</li>
                            <li>To notify you about changes to our Service</li>
                            <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
                            <li>To provide customer care and support</li>
                            <li>To provide analysis or valuable information so that we can improve the Service</li>
                            <li>To monitor the usage of the Service</li>
                            <li>To detect, prevent and address technical issues</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-[#3D4A67] mb-4">3. Data Retention</h2>
                        <p className="text-slate-600 mb-4">
                            MenteIQ will retain your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your Personal Data to the extent necessary to comply with our legal obligations (for example, if we are required to retain your data to comply with applicable laws), resolve disputes, and enforce our legal agreements and policies.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-[#3D4A67] mb-4">4. Security</h2>
                        <p className="text-slate-600 mb-4">
                            The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-[#3D4A67] mb-4">5. Your Rights</h2>
                        <p className="text-slate-600 mb-4">
                            You have the right to access, update, or delete the information we have on you. Whenever made possible, you can access, update or request deletion of your Personal Data directly within your account settings section. If you are unable to perform these actions yourself, please contact us to assist you.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-[#3D4A67] mb-4">6. Contact Us</h2>
                        <p className="text-slate-600 mb-4">
                            If you have any questions about this Privacy Policy, please contact us at privacy@menteiq.ch.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    )
}
