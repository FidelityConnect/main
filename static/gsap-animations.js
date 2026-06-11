// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// Hero Section - Text flies in
gsap.from("h1", {
  duration: 1.2,
  y: 80,
  opacity: 0,
  ease: "power4.out"
});

// Hero subtitle
gsap.from("h1 + p", {
  duration: 1,
  y: 50,
  opacity: 0,
  delay: 0.3,
  ease: "power3.out"
});

// Hero buttons
gsap.from("a[class*='btn'], button", {
  duration: 0.8,
  y: 30,
  opacity: 0,
  delay: 0.6,
  stagger: 0.2,
  ease: "back.out(1.7)"
});

// Sections fade in on scroll
gsap.utils.toArray("section").forEach(section => {
  gsap.from(section, {
    scrollTrigger: {
      trigger: section,
      start: "top 80%",
    },
    duration: 1,
    y: 60,
    opacity: 0,
    ease: "power3.out"
  });
});

// Cards stagger in
gsap.utils.toArray("[class*='card']").forEach(card => {
  gsap.from(card, {
    scrollTrigger: {
      trigger: card,
      start: "top 85%",
    },
    duration: 0.8,
    y: 40,
    opacity: 0,
    stagger: 0.15,
    ease: "power2.out"
  });
});

// Headings slide in from left
gsap.utils.toArray("h2").forEach(heading => {
  gsap.from(heading, {
    scrollTrigger: {
      trigger: heading,
      start: "top 85%",
    },
    duration: 1,
    x: -60,
    opacity: 0,
    ease: "power3.out"
  });
});

// Images scale in
gsap.utils.toArray("img").forEach(img => {
  gsap.from(img, {
    scrollTrigger: {
      trigger: img,
      start: "top 85%",
    },
    duration: 1,
    scale: 0.8,
    opacity: 0,
    ease: "power2.out"
  });
});
