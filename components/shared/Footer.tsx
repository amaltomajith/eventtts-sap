import Image from "next/image";
import Link from "next/link";
import React from "react";

const Footer = () => {
	return (
		<div className="flex max-sm:flex-col justify-between items-center mt-5 p-2 max-sm:gap-1">
			<div className="flex items-center justify-center gap-2">
				<Link
					href="/"
					className="flex items-center justify-center gap-2"
				>
					<Image
						src="/images/logo-full.png"
						alt="logo"
						height={24}
						width={120}
						layout="intrinsic"
					/>
				</Link>
			</div>
			<Link href="https://christuniversity.in/">
				<p className="font-bold max-sm:text-2xl text-primary">
					© 2024 IIIC CHRIST UNIVERSITY
				</p>
			</Link>
		</div>
	);
};

export default Footer;
