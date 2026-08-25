import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CompanyProfile } from '../types';
import { Footer } from './Footer';

type Language = 'en' | 'th';

type PolicySection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

const privacyContent: Record<Language, { title: string; intro: string; updated: string; sections: PolicySection[] }> = {
  en: {
    title: 'Privacy Notice',
    intro: 'This notice explains how Hemingways Jomtien collects, uses, stores and protects personal information when you contact or use our services.',
    updated: 'Last updated: 25 August 2026',
    sections: [
      {
        heading: '1. Who we are',
        paragraphs: [
          'Hemingways Jomtien is operated by Jomtien 414 Co. Ltd. We are responsible for the personal information described in this notice when you contact or use the services of Hemingways Jomtien.',
          'Hemingways Jomtien / Jomtien 414 Co. Ltd.\n414/21 Thappraya Road, Pattaya, Thailand\nEmail: info@hemingwaysjomtien.com\nTelephone: +66 64 620 9225',
        ],
      },
      {
        heading: '2. Information we collect',
        paragraphs: ['We may collect information you provide when you contact us, make a reservation request, order food or delivery, enquire about an event, apply for work, or otherwise communicate with us. This may include:'],
        bullets: [
          'your name and preferred language;',
          'telephone number, email address and messaging-profile information;',
          'reservation details, such as date, time, party size, seating preferences and special requests;',
          'delivery addresses, delivery instructions, order details and payment preference;',
          'messages, photographs, files, voice messages and other information you choose to send;',
          'dietary, allergy, accessibility or celebration information that you choose to provide; and',
          'basic technical and usage information generated when you use our website.',
        ],
      },
      {
        heading: 'Please protect sensitive information',
        paragraphs: ['Please do not send passwords, payment-card details, identity documents or other unnecessary sensitive information through our website or messaging channels. Hemingways does not accept remote card payments.'],
      },
      {
        heading: '3. Information processed through Meta services',
        paragraphs: ['When you contact Hemingways through Instagram Direct or Facebook Messenger, our authorised business integration may receive and process information made available by Meta for that conversation. Depending on the channel and the information you provide, this may include:'],
        bullets: [
          'your Instagram or Facebook display name, username, profile image and platform-scoped identifier;',
          'the contents of messages and attachments you send to Hemingways;',
          'message and conversation identifiers, timestamps and delivery or read status; and',
          'other information that you voluntarily include in the conversation.',
        ],
      },
      {
        heading: 'How the Meta integration is used',
        paragraphs: [
          'This access is used only to receive, organise and reply to customer-initiated conversations involving the authorised Hemingways business accounts. The integration is not used to publish Instagram content, run advertising, access unrelated accounts, or sell personal information.',
          "Meta also processes information under its own terms and privacy policy. Actions taken within Instagram or Facebook, such as deleting or unsending a message, are governed by Meta and may not automatically delete information already retained in Hemingways' business systems.",
        ],
      },
      {
        heading: '4. How and why we use information',
        paragraphs: ['We use personal information where necessary to respond to your request, provide the service you have asked for, meet our legal obligations, and operate and protect our business. This includes:'],
        bullets: [
          'responding to enquiries and providing customer service;',
          'receiving and managing reservation requests, food orders, deliveries, events and special arrangements;',
          'remembering delivery details or service preferences where this is helpful and appropriate;',
          'communicating about an active enquiry, booking, order or service issue;',
          'maintaining the security, reliability and performance of our website and messaging systems;',
          'preventing misuse and keeping appropriate operational and business records; and',
          'complying with legal obligations and protecting the rights and safety of our guests, staff and business.',
        ],
      },
      {
        heading: 'Legal basis and human decision-making',
        paragraphs: [
          'Where applicable, we rely on steps requested before providing a service, performance of a service agreement, compliance with law, legitimate interests that do not override your rights, or consent where consent is legally required. You may withdraw consent at any time where our processing depends on consent, without affecting processing already lawfully completed.',
          'Hemingways staff make final decisions about reservations, orders, deliveries, refunds, complaints and other matters requiring judgement. Automated tools may assist with organising messages, preparing replies or collecting information, but are not authorised to make binding commitments on behalf of Hemingways.',
        ],
      },
      {
        heading: '5. Messaging channels and service providers',
        paragraphs: [
          'If you contact Hemingways through LINE, Facebook Messenger, Instagram, WhatsApp, email or another third-party service, that service may process your information under its own privacy policy. Messages may be brought into our private staff inbox so authorised Hemingways personnel can respond from one place.',
          'We use selected technology providers to operate our website and communications. These may include Google Cloud and Firebase, Meta Platforms, LINE, Chatwoot, email providers and other suppliers needed to deliver the channel you choose to use.',
          'These providers may process information for the relevant service under their contractual and privacy obligations. Some processing may take place outside Thailand. Where required, we use appropriate safeguards for such processing.',
          'We do not sell personal information.',
        ],
      },
      {
        heading: '6. Retention',
        paragraphs: [
          'Customer contact details, delivery information and related conversation records are normally retained for up to 18 months after the most recent relevant interaction. We may retain particular records for longer where required by law, accounting obligations, security, fraud prevention, dispute resolution, or another lawful and documented business need.',
          'When information is no longer reasonably required, we will delete it or remove identifying details where practical.',
        ],
      },
      {
        heading: '7. Security and access',
        paragraphs: ['Access to customer information is limited to authorised Hemingways personnel and service providers who need it for legitimate operational purposes. We use reasonable technical and organisational safeguards. No internet or messaging service, however, can be guaranteed completely secure.'],
      },
      {
        heading: '8. Your choices and rights',
        paragraphs: ['Subject to applicable law, you may ask us to:'],
        bullets: [
          'confirm whether we hold personal information about you and provide access to it;',
          'correct incomplete or inaccurate information;',
          'provide information in a portable form where the right applies;',
          'restrict or object to particular processing;',
          'withdraw consent where processing depends on consent;',
          'delete information that we no longer have a lawful reason to retain; or',
          'explain how we have handled your information.',
        ],
      },
      {
        heading: 'Requests and complaints',
        paragraphs: [
          'We may need to verify your identity before acting on a request and may retain information where the law permits or requires this. You may also raise a concern with Thailand’s Personal Data Protection Committee where applicable.',
          'For deletion instructions, visit our Data Deletion page.',
        ],
      },
      {
        heading: '9. Contact us',
        paragraphs: ['For privacy questions or requests, email info@hemingwaysjomtien.com, telephone +66 64 620 9225, or visit Hemingways Jomtien at the address above.'],
      },
      {
        heading: '10. Changes to this notice',
        paragraphs: ['We may update this notice when our services, technology or legal obligations change. The current version and last-updated date will be published on this page.'],
      },
    ],
  },
  th: {
    title: 'ประกาศความเป็นส่วนตัว',
    intro: 'ประกาศฉบับนี้อธิบายวิธีที่ Hemingways Jomtien เก็บรวบรวม ใช้ จัดเก็บ และปกป้องข้อมูลส่วนบุคคล เมื่อท่านติดต่อหรือใช้บริการของเรา',
    updated: 'ปรับปรุงล่าสุด: 25 สิงหาคม 2569',
    sections: [
      {
        heading: '1. เกี่ยวกับเรา',
        paragraphs: [
          'ร้าน Hemingways Jomtien ดำเนินงานโดย Jomtien 414 Co. Ltd. และเป็นผู้รับผิดชอบข้อมูลส่วนบุคคลตามที่อธิบายไว้ในประกาศฉบับนี้ เมื่อท่านติดต่อหรือใช้บริการของ Hemingways Jomtien',
          'Hemingways Jomtien / Jomtien 414 Co. Ltd.\n414/21 ถนนทัพพระยา เมืองพัทยา ประเทศไทย\nอีเมล: info@hemingwaysjomtien.com\nโทรศัพท์: +66 64 620 9225',
        ],
      },
      {
        heading: '2. ข้อมูลที่เราเก็บรวบรวม',
        paragraphs: ['เราอาจเก็บรวบรวมข้อมูลที่ท่านให้ไว้เมื่อท่านติดต่อเรา ขอจองโต๊ะ สั่งอาหารหรือบริการจัดส่ง สอบถามเกี่ยวกับกิจกรรม สมัครงาน หรือติดต่อเราด้วยวิธีอื่น ข้อมูลดังกล่าวอาจรวมถึง:'],
        bullets: [
          'ชื่อและภาษาที่ท่านต้องการใช้;',
          'หมายเลขโทรศัพท์ อีเมล และข้อมูลโปรไฟล์จากช่องทางการรับส่งข้อความ;',
          'รายละเอียดการขอจอง เช่น วันที่ เวลา จำนวนผู้ใช้บริการ ความต้องการเกี่ยวกับที่นั่ง และคำขอพิเศษ;',
          'ที่อยู่จัดส่ง คำแนะนำในการจัดส่ง รายละเอียดคำสั่งซื้อ และวิธีการชำระเงินที่ต้องการ;',
          'ข้อความ รูปภาพ ไฟล์ ข้อความเสียง และข้อมูลอื่นที่ท่านเลือกส่งให้เรา;',
          'ข้อมูลเกี่ยวกับอาหาร อาการแพ้ การอำนวยความสะดวก หรือการจัดงานฉลองที่ท่านเลือกแจ้งให้เรา; และ',
          'ข้อมูลทางเทคนิคและข้อมูลการใช้งานพื้นฐานที่เกิดขึ้นเมื่อท่านใช้เว็บไซต์ของเรา',
        ],
      },
      {
        heading: 'โปรดปกป้องข้อมูลส่วนตัว',
        paragraphs: ['โปรดอย่าส่งรหัสผ่าน ข้อมูลบัตรชำระเงิน เอกสารยืนยันตัวตน หรือข้อมูลส่วนตัวอื่นที่ไม่จำเป็นผ่านเว็บไซต์หรือช่องทางการรับส่งข้อความของเรา Hemingways ไม่รับชำระเงินด้วยบัตรจากระยะไกล'],
      },
      {
        heading: '3. ข้อมูลที่ประมวลผลผ่านบริการของ Meta',
        paragraphs: ['เมื่อท่านติดต่อ Hemingways ผ่าน Instagram Direct หรือ Facebook Messenger ระบบเชื่อมต่อทางธุรกิจที่ได้รับอนุญาตของเราอาจรับและประมวลผลข้อมูลที่ Meta เปิดให้ใช้สำหรับการสนทนานั้น ทั้งนี้ขึ้นอยู่กับช่องทางและข้อมูลที่ท่านให้ไว้ ข้อมูลดังกล่าวอาจรวมถึง:'],
        bullets: [
          'ชื่อที่แสดง ชื่อผู้ใช้ รูปโปรไฟล์ และรหัสประจำตัวที่ Meta กำหนดให้สำหรับแพลตฟอร์มนั้น;',
          'เนื้อหาของข้อความและไฟล์แนบที่ท่านส่งให้ Hemingways;',
          'รหัสข้อความและรหัสการสนทนา วันเวลา และสถานะการส่งหรือการอ่าน; และ',
          'ข้อมูลอื่นที่ท่านสมัครใจระบุไว้ในการสนทนา',
        ],
      },
      {
        heading: 'วิธีใช้ระบบเชื่อมต่อ Meta',
        paragraphs: [
          'เราใช้การเข้าถึงนี้เฉพาะเพื่อรับ จัดระเบียบ และตอบกลับการสนทนาที่ลูกค้าเป็นผู้เริ่มต้นกับบัญชีธุรกิจของ Hemingways ที่ได้รับอนุญาตเท่านั้น ระบบเชื่อมต่อนี้ไม่ได้ใช้เพื่อเผยแพร่เนื้อหาบน Instagram ดำเนินการโฆษณา เข้าถึงบัญชีที่ไม่เกี่ยวข้อง หรือขายข้อมูลส่วนบุคคล',
          'Meta ประมวลผลข้อมูลตามข้อกำหนดและนโยบายความเป็นส่วนตัวของ Meta เอง การดำเนินการภายใน Instagram หรือ Facebook เช่น การลบหรือยกเลิกการส่งข้อความ อาจไม่ทำให้ข้อมูลที่เก็บไว้แล้วในระบบธุรกิจของ Hemingways ถูกลบโดยอัตโนมัติ',
        ],
      },
      {
        heading: '4. วิธีและเหตุผลที่เราใช้ข้อมูล',
        paragraphs: ['เราใช้ข้อมูลส่วนบุคคลเท่าที่จำเป็นเพื่อดำเนินการตามคำขอของท่าน ให้บริการที่ท่านร้องขอ ปฏิบัติตามกฎหมาย ตลอดจนดำเนินงานและปกป้องธุรกิจของเรา ซึ่งรวมถึง:'],
        bullets: [
          'ตอบคำถามและให้บริการลูกค้า;',
          'รับและจัดการคำขอจองโต๊ะ คำสั่งอาหาร การจัดส่ง กิจกรรม และการจัดเตรียมพิเศษ;',
          'จดจำรายละเอียดการจัดส่งหรือความต้องการในการรับบริการ เมื่อมีความเหมาะสมและเป็นประโยชน์;',
          'ติดต่อเกี่ยวกับคำถาม การจอง คำสั่งซื้อ หรือปัญหาด้านบริการที่กำลังดำเนินการ;',
          'รักษาความปลอดภัย ความน่าเชื่อถือ และประสิทธิภาพของเว็บไซต์และระบบรับส่งข้อความ;',
          'ป้องกันการใช้งานในทางที่ผิดและเก็บรักษาบันทึกการดำเนินงานและธุรกิจที่เหมาะสม; และ',
          'ปฏิบัติตามหน้าที่ทางกฎหมายและปกป้องสิทธิและความปลอดภัยของลูกค้า พนักงาน และธุรกิจของเรา',
        ],
      },
      {
        heading: 'ฐานทางกฎหมายและการตัดสินใจโดยบุคคล',
        paragraphs: [
          'ตามแต่กรณี เราประมวลผลข้อมูลเพื่อดำเนินการตามคำขอก่อนให้บริการ เพื่อปฏิบัติตามข้อตกลงในการให้บริการ เพื่อปฏิบัติตามกฎหมาย เพื่อประโยชน์โดยชอบด้วยกฎหมายที่ไม่กระทบสิทธิของท่านเกินสมควร หรือโดยอาศัยความยินยอมเมื่อกฎหมายกำหนด หากการประมวลผลอาศัยความยินยอม ท่านสามารถถอนความยินยอมได้ทุกเมื่อ โดยไม่กระทบต่อการประมวลผลที่ดำเนินการโดยชอบด้วยกฎหมายก่อนการถอนความยินยอม',
          'พนักงาน Hemingways เป็นผู้ตัดสินใจขั้นสุดท้ายเกี่ยวกับการจอง คำสั่งซื้อ การจัดส่ง การคืนเงิน ข้อร้องเรียน และเรื่องอื่นที่ต้องใช้ดุลยพินิจ เครื่องมืออัตโนมัติอาจช่วยจัดระเบียบข้อความ เตรียมคำตอบ หรือรวบรวมข้อมูล แต่ไม่มีอำนาจให้คำมั่นที่มีผลผูกพันในนามของ Hemingways',
        ],
      },
      {
        heading: '5. ช่องทางการติดต่อและผู้ให้บริการ',
        paragraphs: [
          'หากท่านติดต่อ Hemingways ผ่าน LINE, Facebook Messenger, Instagram, WhatsApp, อีเมล หรือบริการของบุคคลภายนอก บริการนั้นอาจประมวลผลข้อมูลของท่านตามนโยบายความเป็นส่วนตัวของตน ข้อความอาจถูกนำเข้าสู่กล่องข้อความส่วนตัวสำหรับพนักงาน เพื่อให้บุคลากรของ Hemingways ที่ได้รับอนุญาตสามารถตอบกลับจากจุดเดียว',
          'เราใช้ผู้ให้บริการเทคโนโลยีที่คัดเลือกเพื่อดำเนินงานเว็บไซต์และระบบการสื่อสาร ผู้ให้บริการเหล่านี้อาจรวมถึง Google Cloud และ Firebase, Meta Platforms, LINE, Chatwoot, ผู้ให้บริการอีเมล และผู้ให้บริการอื่นที่จำเป็นสำหรับช่องทางที่ท่านเลือกใช้',
          'ผู้ให้บริการอาจประมวลผลข้อมูลเพื่อให้บริการที่เกี่ยวข้องภายใต้สัญญาและหน้าที่ด้านความเป็นส่วนตัวของตน การประมวลผลบางส่วนอาจเกิดขึ้นนอกประเทศไทย และเราจะใช้มาตรการคุ้มครองที่เหมาะสมเมื่อกฎหมายกำหนด',
          'เราไม่ขายข้อมูลส่วนบุคคล',
        ],
      },
      {
        heading: '6. ระยะเวลาการเก็บรักษา',
        paragraphs: [
          'โดยปกติ เราเก็บรายละเอียดการติดต่อลูกค้า ข้อมูลการจัดส่ง และบันทึกการสนทนาที่เกี่ยวข้องไว้ไม่เกิน 18 เดือนนับจากการติดต่อที่เกี่ยวข้องครั้งล่าสุด เราอาจเก็บบันทึกบางรายการไว้นานกว่านั้นเมื่อกฎหมายกำหนด เพื่อการบัญชี ความปลอดภัย การป้องกันการทุจริต การระงับข้อพิพาท หรือเพื่อความจำเป็นทางธุรกิจอื่นที่ชอบด้วยกฎหมายและมีการบันทึกเหตุผลไว้',
          'เมื่อไม่มีความจำเป็นต้องใช้ข้อมูลอย่างสมเหตุสมผลอีกต่อไป เราจะลบข้อมูลหรือนำข้อมูลที่สามารถระบุตัวบุคคลออกเมื่อสามารถดำเนินการได้',
        ],
      },
      {
        heading: '7. ความปลอดภัยและการเข้าถึงข้อมูล',
        paragraphs: ['การเข้าถึงข้อมูลลูกค้าจำกัดเฉพาะบุคลากรของ Hemingways และผู้ให้บริการที่ได้รับอนุญาตและมีความจำเป็นต้องใช้ข้อมูลเพื่อวัตถุประสงค์ในการดำเนินงานที่ชอบด้วยกฎหมาย เราใช้มาตรการรักษาความปลอดภัยทางเทคนิคและทางองค์กรที่เหมาะสม อย่างไรก็ตาม ไม่มีบริการอินเทอร์เน็ตหรือระบบรับส่งข้อความใดที่สามารถรับประกันความปลอดภัยได้อย่างสมบูรณ์'],
      },
      {
        heading: '8. ทางเลือกและสิทธิของท่าน',
        paragraphs: ['ภายใต้กฎหมายที่ใช้บังคับ ท่านอาจขอให้เรา:'],
        bullets: [
          'ยืนยันว่าเราเก็บข้อมูลส่วนบุคคลของท่านหรือไม่ และขอเข้าถึงข้อมูลดังกล่าว;',
          'แก้ไขข้อมูลที่ไม่ครบถ้วนหรือไม่ถูกต้อง;',
          'ส่งมอบข้อมูลในรูปแบบที่สามารถโอนได้ เมื่อสิทธิดังกล่าวใช้บังคับ;',
          'จำกัดหรือคัดค้านการประมวลผลบางประเภท;',
          'ถอนความยินยอม เมื่อการประมวลผลอาศัยความยินยอม;',
          'ลบข้อมูลที่เราไม่มีเหตุผลโดยชอบด้วยกฎหมายในการเก็บรักษาอีกต่อไป; หรือ',
          'ขอคำอธิบายเกี่ยวกับวิธีที่เราจัดการข้อมูลของท่าน',
        ],
      },
      {
        heading: 'คำขอและข้อร้องเรียน',
        paragraphs: [
          'เราอาจต้องตรวจสอบยืนยันตัวตนของท่านก่อนดำเนินการตามคำขอ และอาจเก็บรักษาข้อมูลไว้ในกรณีที่กฎหมายอนุญาตหรือกำหนด ท่านอาจร้องเรียนต่อคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลของประเทศไทยได้ตามที่กฎหมายกำหนด',
          'คำแนะนำในการขอลบข้อมูลอยู่ในหน้าการลบข้อมูล',
        ],
      },
      {
        heading: '9. ติดต่อเรา',
        paragraphs: ['หากมีคำถามหรือคำขอเกี่ยวกับความเป็นส่วนตัว โปรดติดต่อทางอีเมล info@hemingwaysjomtien.com โทรศัพท์ +66 64 620 9225 หรือมาติดต่อที่ Hemingways Jomtien ตามที่อยู่ข้างต้น'],
      },
      {
        heading: '10. การเปลี่ยนแปลงประกาศฉบับนี้',
        paragraphs: ['เราอาจปรับปรุงประกาศฉบับนี้เมื่อบริการ เทคโนโลยี หรือหน้าที่ตามกฎหมายของเราเปลี่ยนแปลง โดยจะเผยแพร่ฉบับปัจจุบันและวันที่ปรับปรุงล่าสุดไว้ในหน้านี้'],
      },
    ],
  },
};

const deletionContent: Record<Language, { title: string; intro: string; updated: string; sections: PolicySection[] }> = {
  en: {
    title: 'Data Deletion',
    intro: 'You may ask Hemingways Jomtien to delete personal information associated with your customer enquiries or messaging conversations, including conversations received through Instagram or Facebook Messenger.',
    updated: 'Last updated: 25 August 2026',
    sections: [
      {
        heading: 'How to make a request',
        paragraphs: ['Email info@hemingwaysjomtien.com with the subject “Personal Data Deletion Request”. Please tell us:'],
        bullets: [
          'the name or username you used when contacting Hemingways;',
          'the channel you used, such as Instagram, Facebook Messenger, LINE, WhatsApp, email or our website;',
          'the approximate date of your most recent conversation; and',
          'enough information for us to identify the correct record without disclosing another person’s information.',
        ],
      },
      {
        heading: 'Protect sensitive information',
        paragraphs: [
          'Do not send passwords, payment-card details, passport copies or other unnecessary sensitive documents.',
          'Requests can also be made by telephone on +66 64 620 9225 or in person at Hemingways Jomtien, 414/21 Thappraya Road, Pattaya, Thailand.',
        ],
      },
      {
        heading: 'What happens next',
        paragraphs: [
          'We will acknowledge your request and may ask for reasonable information to verify that you control the relevant account or contact details. Once verified, we will delete or anonymise personal information that we no longer have a lawful reason to retain. We will handle the request without undue delay and within the period required by applicable law.',
          'Some records may need to be retained where required or permitted by law, including for accounting, security, fraud prevention, dispute resolution or other lawful business-record purposes. If an exception applies, we will explain it where appropriate.',
        ],
      },
      {
        heading: 'Instagram and Facebook actions',
        paragraphs: [
          "Deleting or unsending a message within Instagram or Facebook is controlled by Meta and may not automatically delete information already retained by Hemingways. Likewise, removing the Hemingways integration from a Meta account does not necessarily delete historical information already received. To request deletion from Hemingways' systems, please use the instructions above.",
        ],
      },
      {
        heading: 'Confirmation',
        paragraphs: ['After completing the request, we will confirm the outcome using the verified contact method associated with the request, unless doing so would create a security or privacy risk.'],
      },
    ],
  },
  th: {
    title: 'การขอลบข้อมูล',
    intro: 'ท่านสามารถขอให้ Hemingways Jomtien ลบข้อมูลส่วนบุคคลที่เกี่ยวข้องกับคำถามของลูกค้าหรือการสนทนาผ่านช่องทางรับส่งข้อความ รวมถึงการสนทนาที่ได้รับผ่าน Instagram หรือ Facebook Messenger',
    updated: 'ปรับปรุงล่าสุด: 25 สิงหาคม 2569',
    sections: [
      {
        heading: 'วิธีส่งคำขอ',
        paragraphs: ['ส่งอีเมลไปที่ info@hemingwaysjomtien.com โดยใช้หัวข้อ “Personal Data Deletion Request” และโปรดแจ้งข้อมูลดังต่อไปนี้:'],
        bullets: [
          'ชื่อหรือชื่อผู้ใช้ที่ท่านใช้ในการติดต่อ Hemingways;',
          'ช่องทางที่ท่านใช้ เช่น Instagram, Facebook Messenger, LINE, WhatsApp, อีเมล หรือเว็บไซต์ของเรา;',
          'วันที่โดยประมาณของการสนทนาครั้งล่าสุด; และ',
          'ข้อมูลที่เพียงพอให้เราระบุบันทึกที่ถูกต้องได้โดยไม่เปิดเผยข้อมูลของบุคคลอื่น',
        ],
      },
      {
        heading: 'โปรดปกป้องข้อมูลส่วนตัว',
        paragraphs: [
          'โปรดอย่าส่งรหัสผ่าน ข้อมูลบัตรชำระเงิน สำเนาหนังสือเดินทาง หรือข้อมูลส่วนตัวอื่นที่ไม่จำเป็น',
          'ท่านสามารถส่งคำขอทางโทรศัพท์ที่หมายเลข +66 64 620 9225 หรือมาดำเนินการด้วยตนเองที่ Hemingways Jomtien, 414/21 ถนนทัพพระยา เมืองพัทยา ประเทศไทย',
        ],
      },
      {
        heading: 'ขั้นตอนหลังจากส่งคำขอ',
        paragraphs: [
          'เราจะตอบรับคำขอของท่าน และอาจขอข้อมูลตามสมควรเพื่อตรวจสอบว่าท่านเป็นผู้ควบคุมบัญชีหรือข้อมูลติดต่อที่เกี่ยวข้อง เมื่อตรวจสอบแล้ว เราจะลบหรือทำให้ข้อมูลส่วนบุคคลไม่สามารถระบุตัวบุคคลได้ หากเราไม่มีเหตุผลโดยชอบด้วยกฎหมายที่จะเก็บรักษาข้อมูลนั้นต่อไป เราจะดำเนินการโดยไม่ล่าช้าเกินสมควรและภายในระยะเวลาที่กฎหมายใช้บังคับกำหนด',
          'เราอาจจำเป็นต้องเก็บบันทึกบางรายการไว้เมื่อกฎหมายกำหนดหรืออนุญาต รวมถึงเพื่อการบัญชี ความปลอดภัย การป้องกันการทุจริต การระงับข้อพิพาท หรือวัตถุประสงค์ในการเก็บบันทึกทางธุรกิจอื่นที่ชอบด้วยกฎหมาย หากมีข้อยกเว้น เราจะแจ้งเหตุผลให้ท่านทราบตามความเหมาะสม',
        ],
      },
      {
        heading: 'การดำเนินการใน Instagram และ Facebook',
        paragraphs: ['การลบหรือยกเลิกการส่งข้อความภายใน Instagram หรือ Facebook อยู่ภายใต้การควบคุมของ Meta และอาจไม่ทำให้ข้อมูลที่ Hemingways เก็บไว้แล้วถูกลบโดยอัตโนมัติ เช่นเดียวกัน การนำการเชื่อมต่อกับ Hemingways ออกจากบัญชี Meta อาจไม่ลบข้อมูลในอดีตที่เราได้รับแล้ว หากต้องการขอลบข้อมูลออกจากระบบของ Hemingways โปรดดำเนินการตามคำแนะนำข้างต้น'],
      },
      {
        heading: 'การยืนยันผล',
        paragraphs: ['เมื่อดำเนินการตามคำขอเสร็จสิ้น เราจะแจ้งผลผ่านช่องทางติดต่อที่ได้รับการยืนยันสำหรับคำขอนั้น เว้นแต่การดำเนินการดังกล่าวอาจก่อให้เกิดความเสี่ยงด้านความปลอดภัยหรือความเป็นส่วนตัว'],
      },
    ],
  },
};

const pageStyles = {
  body: { fontFamily: 'var(--font-sans)', color: 'var(--cream-100)', fontSize: 16, lineHeight: 1.8 } as React.CSSProperties,
  heading: { fontFamily: 'var(--font-condensed)', color: 'var(--gold-400)', fontSize: 24, marginTop: 36, marginBottom: 12 } as React.CSSProperties,
};

function PolicyPage({
  content,
  companyProfile,
  alternatePath,
  alternateLabel,
}: {
  content: typeof privacyContent;
  companyProfile: CompanyProfile | null;
  alternatePath: string;
  alternateLabel: Record<Language, string>;
}) {
  const [language, setLanguage] = useState<Language>('en');
  const copy = content[language];

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${copy.title} | Hemingways Jomtien`;
  }, [copy.title]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink-850)' }} lang={language}>
      <main style={{ padding: '140px 24px 80px' }}>
        <article style={{ maxWidth: 'var(--container-narrow)', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 40 }}>
            <div style={{ maxWidth: 680 }}>
              <div style={{ fontFamily: 'var(--font-condensed)', color: 'var(--gold-500)', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 13, marginBottom: 12 }}>Hemingways Jomtien</div>
              <h1 style={{ fontSize: 'clamp(40px, 7vw, 72px)', lineHeight: 1, textTransform: 'uppercase', margin: '0 0 20px' }}>{copy.title}</h1>
              <p style={{ ...pageStyles.body, color: 'var(--text-muted)', margin: 0 }}>{copy.intro}</p>
              <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-faint)', fontSize: 13, marginTop: 14 }}>{copy.updated}</p>
            </div>
            <div role="group" aria-label="Language" style={{ display: 'flex', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              {(['en', 'th'] as Language[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLanguage(option)}
                  aria-pressed={language === option}
                  style={{
                    background: language === option ? 'var(--gold-500)' : 'var(--ink-700)',
                    color: language === option ? 'var(--ink-900)' : 'var(--cream-100)',
                    border: 0,
                    padding: '10px 16px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-condensed)',
                    fontWeight: 600,
                  }}
                >
                  {option === 'en' ? 'English' : 'ไทย'}
                </button>
              ))}
            </div>
          </div>

          <div className="hw-card" style={{ padding: 'clamp(24px, 5vw, 52px)' }}>
            {copy.sections.map((section) => (
              <section key={section.heading}>
                <h2 style={pageStyles.heading}>{section.heading}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} style={{ ...pageStyles.body, whiteSpace: 'pre-line', margin: '0 0 16px' }}>{paragraph}</p>
                ))}
                {section.bullets && (
                  <ul style={{ ...pageStyles.body, paddingLeft: 24, margin: '0 0 20px' }}>
                    {section.bullets.map((item) => <li key={item} style={{ marginBottom: 7 }}>{item}</li>)}
                  </ul>
                )}
              </section>
            ))}

            <div style={{ marginTop: 44, paddingTop: 28, borderTop: '1px solid var(--border)' }}>
              <Link to={alternatePath} onClick={() => window.scrollTo(0, 0)} style={{ color: 'var(--gold-400)', fontFamily: 'var(--font-condensed)', fontSize: 17, fontWeight: 600 }}>
                {alternateLabel[language]}
              </Link>
            </div>
          </div>
        </article>
      </main>
      <Footer companyProfile={companyProfile} hideContactForm />
    </div>
  );
}

export const PrivacyPolicyPage = ({ companyProfile }: { companyProfile: CompanyProfile | null }) => (
  <PolicyPage
    content={privacyContent}
    companyProfile={companyProfile}
    alternatePath="/data-deletion"
    alternateLabel={{ en: 'How to request deletion of your information', th: 'วิธีขอลบข้อมูลของท่าน' }}
  />
);

export const DataDeletionPage = ({ companyProfile }: { companyProfile: CompanyProfile | null }) => (
  <PolicyPage
    content={deletionContent}
    companyProfile={companyProfile}
    alternatePath="/privacy-policy"
    alternateLabel={{ en: 'Read our Privacy Notice', th: 'อ่านประกาศความเป็นส่วนตัวของเรา' }}
  />
);
