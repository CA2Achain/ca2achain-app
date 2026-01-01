export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-4">How It Works</h1>
      <p className="mb-4">
        CA2AChain makes AB 1263 compliance simple for both buyers and sellers. Firearm accessory purchasers verify and store their identification and address one time with our platform. Sellers can then verify buyer eligibility through our API, making the purchasing process faster and easier for everyone.
      </p>
      <p className="mb-4">
        Sellers must still complete their AB 1263 compliance obligations: obtain agreement from the purchaser, ship products in compliance with AB 1263 requiring signature from an adult, and maintain records of CA2AChain's verification number. Our platform handles the identity verification step, streamlining the process while ensuring regulatory compliance.
      </p>
      <p className="mb-4">
        All verification events are recorded on the blockchain using cryptographic hashes that don't reveal personal data, ensuring non-repudiation while maintaining privacy. Buyers maintain control of their data and can request deletion at any time under CCPA.
      </p>
    </div>
  )
}