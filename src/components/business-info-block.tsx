import { businessInfo, customerCenter, supportContacts } from "@/lib/business-info";

/**
 * Shared renderers for the Owner-confirmed business identity and customer
 * contacts, so the footer, the pricing page, the refund policy and the support
 * page cannot state a different centre name, phone number, address or
 * registration number.
 *
 * E-mail is the primary channel everywhere. The telephone number is a business
 * fact inside the 사업자 정보 block, never a call-to-action and never its own
 * contact card.
 */

/**
 * `showServiceContact` keeps the telephone number out of the footer. The footer
 * already carries an e-mail-only support line, and the Owner asked for the
 * footer to stay e-mail centric, so the service contact line is rendered only
 * inside a page-level 사업자 정보 block.
 */
export function BusinessInfoList({ showServiceContact = true }: { showServiceContact?: boolean }) {
  const rows = [
    { term: "상호", value: businessInfo.legalName },
    { term: "대표자", value: businessInfo.representative },
    { term: "사업자등록번호", value: businessInfo.businessRegistrationNumber },
    { term: "통신판매업 신고번호", value: businessInfo.ecommerceRegistrationNumber },
    { term: "사업장 주소", value: businessInfo.address },
  ];

  return (
    <>
      <dl className="business-info">
        {rows.map((row) => (
          <div key={row.term}>
            <dt>{row.term}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {showServiceContact ? (
        /*
       * Service contact line. The telephone number stays published here as a
       * business fact so a reviewer can verify a telephone channel, but it is
       * not a call-to-action and has no separate contact card.
       */
        <p className="business-info__service">
          <span className="business-info__service-name">{customerCenter.serviceName}</span>
          <span className="business-info__service-row">
            <span className="business-info__service-item">
              전화 <a href={customerCenter.phone.href}>{customerCenter.phone.display}</a>
            </span>
            <span className="business-info__service-item">
              일반·제휴 <a href={customerCenter.secondary.href}>{customerCenter.secondary.display}</a>
            </span>
            <span className="business-info__service-item">
              고객지원 <a href={customerCenter.primary.href}>{customerCenter.primary.display}</a>
            </span>
          </span>
        </p>
      ) : null}
    </>
  );
}

/** The customer centre name, used wherever contacts are listed away from /support/. */
export function CustomerCenterName() {
  return <p className="customer-center__name">{customerCenter.displayName}</p>;
}

/** E-mail channels in priority order: primary first, secondary second. */
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
