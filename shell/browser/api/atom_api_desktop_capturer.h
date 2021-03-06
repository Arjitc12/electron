// Copyright (c) 2015 GitHub, Inc.
// Use of this source code is governed by the MIT license that can be
// found in the LICENSE file.

#ifndef SHELL_BROWSER_API_ATOM_API_DESKTOP_CAPTURER_H_
#define SHELL_BROWSER_API_ATOM_API_DESKTOP_CAPTURER_H_

#include <memory>
#include <string>
#include <vector>

#include "chrome/browser/media/webrtc/desktop_media_list_observer.h"
#include "chrome/browser/media/webrtc/native_desktop_media_list.h"
#include "native_mate/handle.h"
#include "shell/browser/api/trackable_object.h"

namespace electron {

namespace api {

class DesktopCapturer : public mate::TrackableObject<DesktopCapturer> {
 public:
  struct Source {
    DesktopMediaList::Source media_list_source;
    // Will be an empty string if not available.
    std::string display_id;

    // Whether or not this source should provide an icon.
    bool fetch_icon = false;
  };

  static mate::Handle<DesktopCapturer> Create(v8::Isolate* isolate);

  static void BuildPrototype(v8::Isolate* isolate,
                             v8::Local<v8::FunctionTemplate> prototype);

  void StartHandling(bool capture_window,
                     bool capture_screen,
                     const gfx::Size& thumbnail_size,
                     bool fetch_window_icons);

 protected:
  explicit DesktopCapturer(v8::Isolate* isolate);
  ~DesktopCapturer() override;

 private:
  void UpdateSourcesList(DesktopMediaList* list);

  std::unique_ptr<DesktopMediaList> window_capturer_;
  std::unique_ptr<DesktopMediaList> screen_capturer_;
  std::vector<DesktopCapturer::Source> captured_sources_;
  bool capture_window_ = false;
  bool capture_screen_ = false;
  bool fetch_window_icons_ = false;
#if defined(OS_WIN)
  bool using_directx_capturer_ = false;
#endif  // defined(OS_WIN)

  base::WeakPtrFactory<DesktopCapturer> weak_ptr_factory_{this};

  DISALLOW_COPY_AND_ASSIGN(DesktopCapturer);
};

}  // namespace api

}  // namespace electron

#endif  // SHELL_BROWSER_API_ATOM_API_DESKTOP_CAPTURER_H_
