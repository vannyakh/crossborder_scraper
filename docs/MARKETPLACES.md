# Marketplace API setup

| Platform | Portal |
|----------|--------|
| Shopee | [open.shopee.com](https://open.shopee.com/) |
| Lazada | [open.lazada.com](https://open.lazada.com/) |
| TikTok Shop | [partner.tiktokshop.com](https://partner.tiktokshop.com/) |
| Shopify | Admin → Settings → Apps → Develop apps |

Configure credentials in the panel (**Settings → Marketplaces**) or `config/ui_config.json`.

Most APIs require uploading product images to their CDN first, then referencing image IDs in `add_product`. Extend exporters in `src/export/` as needed.
