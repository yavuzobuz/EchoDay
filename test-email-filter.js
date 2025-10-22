// Test file for email filtering functionality (JavaScript version)

// Simplified version of EmailFilter class for testing
class EmailFilter {
  constructor() {
    this.settings = {
      autoForward: false,
      blockSpam: true,
      importanceThreshold: 'medium',
      importantSenders: [],
      importantKeywords: []
    };
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  analyzeEmail(email) {
    const isSpam = this.checkSpam(email);
    const importanceScore = this.calculateImportanceScore(email);
    const shouldForward = this.shouldForwardEmail(email, isSpam, importanceScore);

    let reason = '';
    if (isSpam) {
      reason = 'Blocked: Detected as spam/promotional';
    } else if (shouldForward) {
      reason = `Forwarded: Importance score ${importanceScore}/10`;
    } else {
      reason = `Blocked: Low importance (${importanceScore}/10)`;
    }

    return {
      shouldForward,
      isSpam,
      importanceScore,
      reason
    };
  }

  checkSpam(email) {
    if (!this.settings.blockSpam) return false;

    const spamKeywords = ['amazing deal', 'limited time', '90% off', 'click here', 'buy now'];
    const spamLabels = ['SPAM', 'CATEGORY_PROMOTIONS'];
    const suspiciousDomains = ['promotions.com', 'deals.com', 'offers.com'];

    // Check labels
    if (email.labels && email.labels.some(label => spamLabels.includes(label))) {
      return true;
    }

    // Check sender domain
    const domain = email.from.split('@')[1];
    if (suspiciousDomains.includes(domain)) {
      return true;
    }

    // Check content for spam keywords
    const content = (email.subject + ' ' + email.body).toLowerCase();
    if (spamKeywords.some(keyword => content.includes(keyword))) {
      return true;
    }

    // Check for excessive emoji/caps
    const emojiCount = (email.subject.match(/[🎉🚀💰🔥⭐]/g) || []).length;
    const capsRatio = (email.subject.match(/[A-Z]/g) || []).length / email.subject.length;
    
    return emojiCount > 2 || capsRatio > 0.5;
  }

  calculateImportanceScore(email) {
    let score = 5; // Base score

    // Sender importance
    if (this.settings.importantSenders.includes(email.from)) {
      score += 3;
    }

    // Important labels
    if (email.labels && email.labels.includes('IMPORTANT')) {
      score += 2;
    }

    // Keyword matching
    const content = (email.subject + ' ' + email.body).toLowerCase();
    const matchedKeywords = this.settings.importantKeywords.filter(keyword => 
      content.includes(keyword.toLowerCase())
    );
    score += matchedKeywords.length;

    // Time sensitivity (recent emails get slight boost)
    const hoursSinceReceived = (Date.now() - email.date.getTime()) / (1000 * 60 * 60);
    if (hoursSinceReceived < 1) score += 0.5;

    return Math.min(Math.max(Math.round(score), 1), 10);
  }

  shouldForwardEmail(email, isSpam, importanceScore) {
    if (!this.settings.autoForward) return false;
    if (isSpam) return false;

    const thresholds = { low: 4, medium: 6, high: 8 };
    return importanceScore >= thresholds[this.settings.importanceThreshold];
  }
}

// Test data - various email types
const testEmails = [
  {
    // Important business email
    from: 'boss@company.com',
    subject: 'Urgent: Project deadline moved to tomorrow',
    body: 'Hi team, we need to deliver the project by tomorrow. Please prioritize this.',
    labels: ['IMPORTANT'],
    date: new Date()
  },
  {
    // Spam email
    from: 'noreply@promotions.com',
    subject: '🎉 AMAZING DEAL! 90% OFF EVERYTHING!!!',
    body: 'LIMITED TIME OFFER! Buy now and save thousands! Click here to claim your discount!',
    labels: ['SPAM'],
    date: new Date()
  },
  {
    // Newsletter/promotional
    from: 'newsletter@techblog.com',
    subject: 'Weekly Tech Newsletter - Latest Updates',
    body: 'Here are this week\'s top tech stories and updates from our blog.',
    labels: ['CATEGORY_PROMOTIONS'],
    date: new Date()
  },
  {
    // Important client email
    from: 'client@importantcompany.com',
    subject: 'Meeting request for next week',
    body: 'Hi, I would like to schedule a meeting to discuss the project requirements.',
    labels: ['INBOX'],
    date: new Date()
  },
  {
    // Regular email
    from: 'friend@gmail.com',
    subject: 'How are you doing?',
    body: 'Hey, just wanted to check in and see how you\'re doing.',
    labels: ['INBOX'],
    date: new Date()
  }
];

// Test filter settings
const filterSettings = {
  autoForward: true,
  blockSpam: true,
  importanceThreshold: 'medium',
  importantSenders: ['boss@company.com', 'client@importantcompany.com'],
  importantKeywords: ['urgent', 'deadline', 'meeting', 'project']
};

// Initialize filter
const emailFilter = new EmailFilter();
emailFilter.updateSettings(filterSettings);

console.log('🧪 Testing Email Filtering System\n');
console.log('Filter Settings:', filterSettings);
console.log('\n' + '='.repeat(50) + '\n');

// Test each email
testEmails.forEach((email, index) => {
  console.log(`📧 Test Email ${index + 1}:`);
  console.log(`From: ${email.from}`);
  console.log(`Subject: ${email.subject}`);
  console.log(`Labels: ${email.labels.join(', ')}`);
  
  const result = emailFilter.analyzeEmail(email);
  
  console.log(`\n📊 Analysis Result:`);
  console.log(`Should Forward: ${result.shouldForward ? '✅ YES' : '❌ NO'}`);
  console.log(`Is Spam: ${result.isSpam ? '🚫 YES' : '✅ NO'}`);
  console.log(`Importance Score: ${result.importanceScore}/10`);
  console.log(`Reason: ${result.reason}`);
  
  console.log('\n' + '-'.repeat(30) + '\n');
});

console.log('🎯 Summary:');
const results = testEmails.map(email => emailFilter.analyzeEmail(email));
const forwardedCount = results.filter(r => r.shouldForward).length;
const spamCount = results.filter(r => r.isSpam).length;

console.log(`Total emails tested: ${testEmails.length}`);
console.log(`Emails that would be forwarded: ${forwardedCount}`);
console.log(`Emails detected as spam: ${spamCount}`);
console.log(`Emails blocked: ${testEmails.length - forwardedCount}`);

// Expected results validation
console.log('\n🔍 Validation:');
console.log('Expected forwarded emails: boss@company.com (urgent), client@importantcompany.com (meeting)');
console.log('Expected spam: promotions.com (promotional spam)');
console.log('Expected blocked: newsletter (promotional), friend (low importance)');

// Verify results match expectations
const bossEmail = results[0]; // boss@company.com
const spamEmail = results[1]; // promotions.com
const newsletterEmail = results[2]; // newsletter
const clientEmail = results[3]; // client
const friendEmail = results[4]; // friend

console.log('\n✅ Test Results:');
console.log(`Boss email forwarded: ${bossEmail.shouldForward ? 'PASS' : 'FAIL'}`);
console.log(`Spam email blocked: ${spamEmail.isSpam ? 'PASS' : 'FAIL'}`);
console.log(`Newsletter blocked: ${newsletterEmail.isSpam ? 'PASS' : 'FAIL'}`);
console.log(`Client email forwarded: ${clientEmail.shouldForward ? 'PASS' : 'FAIL'}`);
console.log(`Friend email blocked: ${!friendEmail.shouldForward ? 'PASS' : 'FAIL'}`);

const allTestsPassed = bossEmail.shouldForward && spamEmail.isSpam && 
                      newsletterEmail.isSpam && clientEmail.shouldForward && 
                      !friendEmail.shouldForward;

console.log(`\n🏆 Overall Test Result: ${allTestsPassed ? 'ALL TESTS PASSED! ✅' : 'SOME TESTS FAILED ❌'}`);