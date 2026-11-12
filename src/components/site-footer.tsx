import { Link } from "@tanstack/react-router";
import { COMPANY } from "@/lib/company";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-5">
        <div>
          <div className="font-display text-lg font-bold">
            SK<span className="text-gradient">TECHLAB</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            The modern website builder for Indian businesses. Launch in minutes.
          </p>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">Product</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/categories" className="hover:text-foreground">Templates</Link></li>
            <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
            <li><Link to="/blog" className="hover:text-foreground">Blog</Link></li>
            <li><Link to="/auth" className="hover:text-foreground">Sign up</Link></li>

          </ul>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">Services</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/services/digital-marketing" className="hover:text-foreground">Digital Marketing</Link></li>
            <li><Link to="/services/gmb-boost" className="hover:text-foreground">Google My Business</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">Legal</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link></li>
            <li><Link to="/terms-and-conditions" className="hover:text-foreground">Terms &amp; Conditions</Link></li>
            <li><Link to="/refund-policy" className="hover:text-foreground">Refund &amp; Cancellation Policy</Link></li>
            <li><Link to="/delivery-policy" className="hover:text-foreground">Digital Delivery Policy</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact Us</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">Company</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>{COMPANY.supportEmail}</li>
            <li>India</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SKTECHLAB. All rights reserved.
      </div>
    </footer>
  );
}
