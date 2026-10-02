import { businessInfo, supportContacts, supportPhone } from "@/lib/business-info";

/**
 * Shared renderers for the Owner-confirmed business identity and customer
 * contacts, so the footer, the pricing page, the refund policy and the support
 * page cannot state a different phone number, address or registration number.
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

export function ContactList() {
  return (
    <ul className="contact-list">
      <li>
        <span className="contact-list__label">{supportPhone.label}</span>
        <a className="contact-list__value" href={supportPhone.href}>{supportPhone.display}</a>
      </li>
      {supportContacts.map((contact) => (
        <li key={contact.id}>
          <span className="contact-list__label">{contact.label}</span>
          <a className="contact-list__value" href={contact.href}>{contact.display}</a>
          <span className="contact-list__note">{contact.description}</span>
        </li>
      ))}
    </ul>
  );
}