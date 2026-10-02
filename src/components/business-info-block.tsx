import { businessInfo, customerCenter, supportContacts, supportPhone } from "@/lib/business-info";

/**
 * Shared renderers for the Owner-confirmed business identity and customer
 * contacts, so the footer, the pricing page, the refund policy and the support
 * page cannot state a different centre name, phone number, address or
 * registration number.
 *
 * E-mail is the primary channel everywhere. The telephone channel has its own
 * renderer and is used in a secondary position only, because it is published
 * for verification rather than promoted as the way to reach support.
 */

export function BusinessInfoList() {
  const rows = [
    { term: "상호", value: businessInfo.legalName },
    { term: "대표자", value: businessInfo.representative },
    { term: "사업자등록번호", value: businessInfo.businessRegistrationNumber },
    { term: "통신판매업 신고번호", value: businessInfo.ecommerceRegistrationNumber },
    { term: "사업장 주소", value: businessInfo.address },
  ];

  return (
    <dl className="business-info">
      {rows.map((row) => (
        <div key={row.term}>
          <dt>{row.term}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The customer centre name, used wherever contacts are listed away from /support/. */
export function CustomerCenterName() {
  return <p className="customer-center__name">{customerCenter.displayName}</p>;
}

/** E-mail channels in priority order. */
export function ContactList({ showName = false }: { showName?: boolean }) {
  return (
    <div className="customer-center">
      {showName ? <CustomerCenterName /> : null}
      <ul className="contact-list">
        {supportContacts.map((contact, index) => (
          <li className={index === 0 ? "contact-list__item contact-list__item--primary" : "contact-list__item"} key={contact.id}>
            <span className="contact-list__label">{contact.label}</span>
            <a className="contact-list__value" href={contact.href}>{contact.display}</a>
            <span className="contact-list__note">{contact.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Secondary telephone channel. Rendered below the e-mail channels and never as
 * a headline action. Operating hours are intentionally absent.
 */
export function PhoneContact() {
  return (
    <div className="contact-phone">
      <span className="contact-phone__label">{supportPhone.label}</span>
      <a className="contact-phone__value" href={supportPhone.href}>{supportPhone.display}</a>
      <p className="contact-phone__note">{supportPhone.note}</p>
    </div>
  );
}

/** Compact footer line: the centre name followed by its e-mail channels. */
export function CustomerCenterFooterContact() {
  return (
    <p className="site-footer__contact">
      <span className="site-footer__contact-name">{customerCenter.displayName}</span>
      <a href={customerCenter.primary.href}>{customerCenter.primary.display}</a>
      <a href={customerCenter.secondary.href}>{customerCenter.secondary.display}</a>
    </p>
  );
}